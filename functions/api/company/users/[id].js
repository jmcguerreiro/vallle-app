import { normaliseLocale } from "../../_locales.js";
import { requireStore } from "../../_store.js";

/**
 * GET /api/company/users/:id — Get a single user belonging to the active store.
 * Requires admin role.
 */
export async function onRequestGet(context) {
  const { request, env, params, data } = context;
  const { id } = params;

  const result = await requireStore(request, env, data.user.sub);
  if (result instanceof Response) return result;

  try {
    // Verify user belongs to this store
    const link = await env.DB.prepare(
      "SELECT id FROM store_users WHERE store_id = ? AND user_id = ?",
    )
      .bind(result.storeId, id)
      .first();

    if (!link) {
      return Response.json(
        { error: { message: "User not found", code: "USER_NOT_FOUND" } },
        { status: 404 },
      );
    }

    const user = await env.DB.prepare(
      "SELECT id, name, email, role, status, locale, created_at FROM users WHERE id = ?",
    )
      .bind(id)
      .first();

    if (!user) {
      return Response.json(
        { error: { message: "User not found", code: "USER_NOT_FOUND" } },
        { status: 404 },
      );
    }

    // Company admins must never see platform super_admins, even when one is
    // assigned to their store. Hide the account entirely.
    if (user.role === "super_admin") {
      return Response.json(
        { error: { message: "User not found", code: "USER_NOT_FOUND" } },
        { status: 404 },
      );
    }

    return Response.json({ data: { user } });
  } catch (error) {
    const err = new Error("Company: Failed to get user");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * PUT /api/company/users/:id — Update a user belonging to the active store.
 * Requires admin role. Can update name, email, role (user/admin), and status.
 */
export async function onRequestPut(context) {
  const { request, env, params, data } = context;
  const { id } = params;

  const result = await requireStore(request, env, data.user.sub);
  if (result instanceof Response) return result;

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
    // Verify user belongs to this store and capture their current role
    const link = await env.DB.prepare(
      `SELECT su.id, u.role
       FROM store_users su
       JOIN users u ON u.id = su.user_id
       WHERE su.store_id = ? AND su.user_id = ?`,
    )
      .bind(result.storeId, id)
      .first();

    if (!link) {
      return Response.json(
        { error: { message: "User not found", code: "USER_NOT_FOUND" } },
        { status: 404 },
      );
    }

    // Company admins must never manage platform super_admins, even when one is
    // assigned to their store. Hide the account entirely (404) so it can't be
    // probed, and so its role/status can't be altered.
    if (link.role === "super_admin") {
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

    // Company admins can only set user or admin roles
    const role = body.role === "admin" ? "admin" : "user";
    const status = body.status === "inactive" ? "inactive" : "active";
    const locale = normaliseLocale(body.locale);
    const now = new Date().toISOString();

    await env.DB.prepare(
      `UPDATE users SET name = ?, email = ?, role = ?, status = ?, locale = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(
        body.name.trim(),
        body.email.trim().toLowerCase(),
        role,
        status,
        locale,
        now,
        id,
      )
      .run();

    const updatedUser = await env.DB.prepare(
      "SELECT id, name, email, role, status, locale, created_at FROM users WHERE id = ?",
    )
      .bind(id)
      .first();

    return Response.json({ data: { user: updatedUser } });
  } catch (error) {
    const err = new Error("Company: Failed to update user");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
