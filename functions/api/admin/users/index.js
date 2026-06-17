import { buildLikePattern, parseListQuery } from "../../_list.js";
import { normaliseLocale } from "../../_locales.js";
import { generateUlid } from "../../_ulid.js";
import { isStrongPassword, isValidEmail } from "../../_validation.js";
import { hashPassword } from "../../auth/_helpers.js";

/**
 * GET /api/admin/users — List all users with their store associations (super_admin only).
 * Server-side pagination, search (name/email), sort, and status/role filters.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const { limit, offset, search, sort, order } = parseListQuery(url, {
      sortableColumns: new Set(["name", "email", "created_at", "updated_at"]),
      defaultSort: "name",
      defaultOrder: "ASC",
    });
    const status = url.searchParams.get("status") || "all";
    const role = url.searchParams.get("role") || "all";

    const where = [];
    const params = [];

    if (search) {
      const like = buildLikePattern(search);
      where.push(
        String.raw`(name LIKE ? ESCAPE '\' OR email LIKE ? ESCAPE '\')`,
      );
      params.push(like, like);
    }

    if (status !== "all") {
      where.push("status = ?");
      params.push(status);
    }

    if (role !== "all") {
      where.push("role = ?");
      params.push(role);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const [countResult, dataResult] = await env.DB.batch([
      env.DB.prepare(`SELECT COUNT(*) AS total FROM users ${whereSql}`).bind(
        ...params,
      ),
      env.DB.prepare(
        `SELECT id, name, email, role, status, created_at, updated_at
         FROM users
         ${whereSql}
         ORDER BY ${sort} ${order}
         LIMIT ? OFFSET ?`,
      ).bind(...params, limit, offset),
    ]);

    const total = countResult.results[0].total;
    const users = dataResult.results;

    // Store associations only for the users on this page.
    const storesByUser = {};
    if (users.length > 0) {
      const placeholders = users.map(() => "?").join(", ");
      const { results: storeLinks } = await env.DB.prepare(
        `SELECT su.user_id, su.store_id, s.name AS store_name
         FROM store_users su
         JOIN stores s ON s.id = su.store_id
         WHERE su.user_id IN (${placeholders})`,
      )
        .bind(...users.map((u) => u.id))
        .all();

      for (const link of storeLinks) {
        if (!storesByUser[link.user_id]) storesByUser[link.user_id] = [];
        storesByUser[link.user_id].push({
          store_id: link.store_id,
          store_name: link.store_name,
        });
      }
    }

    const result = users.map((u) => ({
      ...u,
      stores: storesByUser[u.id] ?? [],
    }));

    return Response.json({ data: result, meta: { total, limit, offset } });
  } catch (error) {
    const err = new Error("Admin: Failed to list users");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * POST /api/admin/users — Create a new user and optionally assign to a store (super_admin only).
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPost(context) {
  const { request, env } = context;

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
  if (!isStrongPassword(body.password)) {
    return Response.json(
      {
        error: {
          message: "Password does not meet security requirements",
          code: "WEAK_PASSWORD",
        },
      },
      { status: 400 },
    );
  }

  try {
    const existing = await env.DB.prepare(
      "SELECT id FROM users WHERE email = ?",
    )
      .bind(body.email.trim().toLowerCase())
      .first();

    if (existing) {
      return Response.json(
        { error: { message: "Email already in use", code: "EMAIL_TAKEN" } },
        { status: 409 },
      );
    }

    // Validate the store assignment BEFORE creating the user, so a bad store_id
    // can't leave an orphaned account behind.
    if (body.store_id) {
      const store = await env.DB.prepare("SELECT id FROM stores WHERE id = ?")
        .bind(body.store_id)
        .first();
      if (!store) {
        return Response.json(
          { error: { message: "Store not found", code: "STORE_NOT_FOUND" } },
          { status: 404 },
        );
      }
    }

    const id = generateUlid();
    const passwordHash = await hashPassword(body.password);
    // Account role is the platform flag only: super_admin or plain user.
    const accountRole = body.role === "super_admin" ? "super_admin" : "user";
    // Store role is store-scoped and chosen independently of the account role
    // (admin/user). Defaults to admin — assigning a user to a store usually
    // means making them its owner/manager.
    const storeRole = body.store_role === "user" ? "user" : "admin";
    const locale = normaliseLocale(body.locale);
    const now = new Date().toISOString();

    const statements = [
      env.DB.prepare(
        `INSERT INTO users (id, name, email, password, role, status, locale, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      ).bind(
        id,
        body.name.trim(),
        body.email.trim().toLowerCase(),
        passwordHash,
        accountRole,
        locale,
        now,
        now,
      ),
    ];

    if (body.store_id) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO store_users (id, store_id, user_id, role, status, created_at)
           VALUES (?, ?, ?, ?, 'active', ?)`,
        ).bind(generateUlid(), body.store_id, id, storeRole, now),
      );
    }

    await env.DB.batch(statements);

    const newUser = await env.DB.prepare(
      "SELECT id, name, email, role, status, locale, created_at FROM users WHERE id = ?",
    )
      .bind(id)
      .first();

    return Response.json({ data: { user: newUser } }, { status: 201 });
  } catch (error) {
    const err = new Error("Admin: Failed to create user");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
