import { normaliseLocale } from "../../_locales.js";
import { isValidEmail } from "../../_validation.js";

const MEMBERSHIP_STATUSES = new Set(["active", "inactive"]);

/**
 * GET /api/company/users/:id — Get a user belonging to the active store.
 * role/status are store-scoped (store_users). Store-admin only.
 */
export async function onRequestGet(context) {
  const { env, params, data } = context;
  const { id } = params;
  const { storeId } = data.store;

  try {
    // Resolve the membership (store-scoped role + status) and account role.
    const row = await env.DB.prepare(
      `SELECT u.id, u.name, u.email, u.locale, u.created_at,
              u.role AS account_role,
              su.role AS role, su.status AS status
       FROM store_users su
       JOIN users u ON u.id = su.user_id
       WHERE su.store_id = ? AND su.user_id = ?`,
    )
      .bind(storeId, id)
      .first();

    // Company admins must never see platform super_admins, even when one is
    // assigned to their store. Hide the account entirely (404).
    if (!row || row.account_role === "super_admin") {
      return Response.json(
        { error: { message: "User not found", code: "USER_NOT_FOUND" } },
        { status: 404 },
      );
    }

    return Response.json({
      data: {
        user: {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          status: row.status,
          locale: row.locale,
          created_at: row.created_at,
        },
      },
    });
  } catch (error) {
    const err = new Error("Company: Failed to get user");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * PUT /api/company/users/:id — Update a user belonging to the active store.
 * Updates the account identity (name/email/locale) and the store-scoped role +
 * membership status (store_users). Store-admin only.
 */
export async function onRequestPut(context) {
  const { request, env, params, data } = context;
  const { id } = params;
  const { storeId } = data.store;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid request body", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }

  if (!body.name?.trim()) {
    return Response.json(
      { error: { message: "Name is required", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }
  if (!isValidEmail(body.email)) {
    return Response.json(
      {
        error: {
          message: "A valid email is required",
          code: "VALIDATION_FAILED",
        },
      },
      { status: 400 },
    );
  }

  try {
    // Verify the user belongs to this store and capture their account role plus
    // their current store-scoped role/status.
    const link = await env.DB.prepare(
      `SELECT su.id, su.role AS member_role, su.status AS member_status,
              u.role AS account_role
       FROM store_users su
       JOIN users u ON u.id = su.user_id
       WHERE su.store_id = ? AND su.user_id = ?`,
    )
      .bind(storeId, id)
      .first();

    // Company admins must never manage platform super_admins, even when one is
    // assigned to their store. Hide the account entirely (404) so it can't be
    // probed, and so its role/status can't be altered.
    if (!link || link.account_role === "super_admin") {
      return Response.json(
        { error: { message: "User not found", code: "USER_NOT_FOUND" } },
        { status: 404 },
      );
    }

    const emailConflict = await env.DB.prepare(
      "SELECT id FROM users WHERE email = ? AND id != ?",
    )
      .bind(body.email.trim().toLowerCase(), id)
      .first();

    if (emailConflict) {
      return Response.json(
        { error: { message: "Email already in use", code: "EMAIL_TAKEN" } },
        { status: 409 },
      );
    }

    // Store-scoped role + membership status. Company admins can only grant the
    // user or admin store role. A user can't change their OWN role or status —
    // that would let an admin accidentally lock themselves out of this store, so
    // we keep their current values when editing themselves.
    const isSelf = id === data.user.sub;
    const role = isSelf
      ? link.member_role
      : body.role === "admin"
        ? "admin"
        : "user";
    const status = isSelf
      ? link.member_status
      : MEMBERSHIP_STATUSES.has(body.status)
        ? body.status
        : "active";
    const locale = normaliseLocale(body.locale);
    const now = new Date().toISOString();

    await env.DB.batch([
      env.DB.prepare(
        "UPDATE users SET name = ?, email = ?, locale = ?, updated_at = ? WHERE id = ?",
      ).bind(
        body.name.trim(),
        body.email.trim().toLowerCase(),
        locale,
        now,
        id,
      ),
      env.DB.prepare(
        "UPDATE store_users SET role = ?, status = ? WHERE store_id = ? AND user_id = ?",
      ).bind(role, status, storeId, id),
    ]);

    const updatedUser = await env.DB.prepare(
      `SELECT u.id, u.name, u.email, su.role AS role, su.status AS status,
              u.locale, u.created_at
       FROM users u
       JOIN store_users su ON su.user_id = u.id AND su.store_id = ?
       WHERE u.id = ?`,
    )
      .bind(storeId, id)
      .first();

    return Response.json({ data: { user: updatedUser } });
  } catch (error) {
    const err = new Error("Company: Failed to update user");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
