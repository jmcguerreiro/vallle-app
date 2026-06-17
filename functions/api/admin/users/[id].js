import { normaliseLocale } from "../../_locales.js";

/**
 * GET /api/admin/users/:id — Get a single user with their store associations (super_admin only).
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { env, params } = context;
  const { id } = params;

  try {
    const foundUser = await env.DB.prepare(
      "SELECT id, name, email, role, status, locale, created_at FROM users WHERE id = ?",
    )
      .bind(id)
      .first();

    if (!foundUser) {
      return Response.json(
        { error: { message: "User not found", code: "USER_NOT_FOUND" } },
        { status: 404 },
      );
    }

    const { results: stores } = await env.DB.prepare(
      `SELECT su.store_id, s.name AS store_name, su.role, su.status
       FROM store_users su
       JOIN stores s ON s.id = su.store_id
       WHERE su.user_id = ?
       ORDER BY s.name ASC`,
    )
      .bind(id)
      .all();

    return Response.json({ data: { user: { ...foundUser, stores } } });
  } catch (error) {
    const err = new Error("Admin: Failed to get user");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * PUT /api/admin/users/:id — Update a user (super_admin only).
 *
 * Account-level: name, email, locale, `role` (collapsed to the platform flag —
 * `super_admin` or `user`), and `status` (the account kill-switch). A super_admin
 * can't change their own role or status (self-lockout guard).
 *
 * Store-scoped: an optional `stores` array of `{ store_id, role, status }` updates
 * the role (`admin`/`user`) and membership status (`active`/`inactive`) of the
 * user's *existing* memberships. Unknown store_ids are ignored (no membership is
 * created or removed here).
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPut(context) {
  const { request, env, params, data } = context;
  const { id } = params;

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
  if (
    !body.email?.trim() ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
  ) {
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
    const existing = await env.DB.prepare(
      "SELECT id, role, status FROM users WHERE id = ?",
    )
      .bind(id)
      .first();

    if (!existing) {
      return Response.json(
        { error: { message: "User not found", code: "USER_NOT_FOUND" } },
        { status: 404 },
      );
    }

    // Check email uniqueness (excluding this user)
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

    // A user can't change their OWN account role or status — a super_admin could
    // otherwise accidentally demote or deactivate themselves and lose access.
    // Keep their current values when editing themselves.
    const isSelf = id === data.user.sub;
    // Account role is now only the platform flag: super_admin or plain user.
    // The admin/user distinction lives on the store membership, not the account.
    const role = isSelf
      ? existing.role
      : body.role === "super_admin"
        ? "super_admin"
        : "user";
    const status = isSelf
      ? existing.status
      : body.status === "inactive"
        ? "inactive"
        : "active";
    const locale = normaliseLocale(body.locale);
    const now = new Date().toISOString();

    // Build the store-membership updates. Only valid role/status values are
    // written, and only for memberships the user already has (the WHERE clause
    // on user_id + store_id makes an unknown store_id a no-op).
    const membershipUpdates = [];
    if (Array.isArray(body.stores)) {
      for (const s of body.stores) {
        if (!s?.store_id) continue;
        const storeRole = s.role === "admin" ? "admin" : "user";
        const storeStatus = s.status === "inactive" ? "inactive" : "active";
        membershipUpdates.push(
          env.DB.prepare(
            `UPDATE store_users SET role = ?, status = ?
             WHERE user_id = ? AND store_id = ?`,
          ).bind(storeRole, storeStatus, id, s.store_id),
        );
      }
    }

    await env.DB.batch([
      env.DB.prepare(
        `UPDATE users SET name = ?, email = ?, role = ?, status = ?, locale = ?, updated_at = ? WHERE id = ?`,
      ).bind(
        body.name.trim(),
        body.email.trim().toLowerCase(),
        role,
        status,
        locale,
        now,
        id,
      ),
      ...membershipUpdates,
    ]);

    const updatedUser = await env.DB.prepare(
      "SELECT id, name, email, role, status, locale, created_at FROM users WHERE id = ?",
    )
      .bind(id)
      .first();

    return Response.json({ data: { user: updatedUser } });
  } catch (error) {
    const err = new Error("Admin: Failed to update user");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
