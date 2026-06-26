import { normaliseLocale } from "../../_locales.js";
import { generateUlid } from "../../_ulid.js";
import { isValidEmail } from "../../_validation.js";

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
 * Store-scoped: an optional `stores` array of `{ store_id, role }` is the full
 * desired set of memberships (same multiselect model as user creation). Stores
 * not already linked are inserted (status `active`), existing ones have their
 * role updated, and memberships absent from the list are removed. Existing
 * membership status is left untouched on kept rows.
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

    // Reconcile memberships against the submitted list (the same multiselect
    // model as user creation): the array is the full desired set, so validate
    // every store exists, then add new links, update kept ones' role, and remove
    // any that were deselected.
    const storeAssignments = Array.isArray(body.stores) ? body.stores : [];

    if (storeAssignments.length > 0) {
      const storeIds = storeAssignments.map((s) => s.store_id);
      const placeholders = storeIds.map(() => "?").join(", ");
      const { results: found } = await env.DB.prepare(
        `SELECT id FROM stores WHERE id IN (${placeholders})`,
      )
        .bind(...storeIds)
        .all();
      const foundIds = new Set(found.map((r) => r.id));
      if (storeIds.some((sid) => !foundIds.has(sid))) {
        return Response.json(
          { error: { message: "Store not found", code: "STORE_NOT_FOUND" } },
          { status: 404 },
        );
      }
    }

    const { results: currentMemberships } = await env.DB.prepare(
      "SELECT store_id FROM store_users WHERE user_id = ?",
    )
      .bind(id)
      .all();
    const currentStoreIds = new Set(currentMemberships.map((m) => m.store_id));
    const submittedStoreIds = new Set(storeAssignments.map((s) => s.store_id));

    const membershipStatements = [];
    for (const assignment of storeAssignments) {
      // Store role defaults to admin — assigning a user to a store usually means
      // making them its owner/manager.
      const storeRole = assignment.role === "user" ? "user" : "admin";
      if (currentStoreIds.has(assignment.store_id)) {
        membershipStatements.push(
          env.DB.prepare(
            "UPDATE store_users SET role = ? WHERE user_id = ? AND store_id = ?",
          ).bind(storeRole, id, assignment.store_id),
        );
      } else {
        membershipStatements.push(
          env.DB.prepare(
            `INSERT INTO store_users (id, store_id, user_id, role, status, created_at)
             VALUES (?, ?, ?, ?, 'active', ?)`,
          ).bind(generateUlid(), assignment.store_id, id, storeRole, now),
        );
      }
    }
    for (const storeId of currentStoreIds) {
      if (!submittedStoreIds.has(storeId)) {
        membershipStatements.push(
          env.DB.prepare(
            "DELETE FROM store_users WHERE user_id = ? AND store_id = ?",
          ).bind(id, storeId),
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
      ...membershipStatements,
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
