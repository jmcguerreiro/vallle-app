import { buildLikePattern, parseListQuery } from "../../_list.js";
import { normaliseLocale } from "../../_locales.js";
import { requireStore } from "../../_store.js";
import { generateUlid } from "../../_ulid.js";
import { hashPassword } from "../../auth/_helpers.js";

/**
 * GET /api/company/users — List users for the active store.
 * Server-side pagination, search (name/email), sort, and status filter.
 * Requires admin role (admin or super_admin).
 */
export async function onRequestGet(context) {
  const { request, env, data } = context;

  const result = await requireStore(request, env, data.user.sub);
  if (result instanceof Response) return result;

  try {
    const url = new URL(request.url);
    const { limit, offset, search, sort, order } = parseListQuery(url, {
      sortableColumns: new Set(["name", "email", "created_at", "updated_at"]),
      defaultSort: "name",
      defaultOrder: "ASC",
    });
    const status = url.searchParams.get("status") || "all";

    // Never expose platform super_admins in a company-scoped listing, even when
    // one is assigned to the store — they aren't the store's to manage.
    const where = ["su.store_id = ?", "u.role != 'super_admin'"];
    const params = [result.storeId];

    if (search) {
      const like = buildLikePattern(search);
      where.push(
        String.raw`(u.name LIKE ? ESCAPE '\' OR u.email LIKE ? ESCAPE '\')`,
      );
      params.push(like, like);
    }

    if (status !== "all") {
      where.push("u.status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const fromSql = "FROM store_users su JOIN users u ON u.id = su.user_id";

    const [countResult, dataResult] = await env.DB.batch([
      env.DB.prepare(
        `SELECT COUNT(*) AS total ${fromSql} WHERE ${whereSql}`,
      ).bind(...params),
      env.DB.prepare(
        `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.updated_at
         ${fromSql}
         WHERE ${whereSql}
         ORDER BY u.${sort} ${order}
         LIMIT ? OFFSET ?`,
      ).bind(...params, limit, offset),
    ]);

    const total = countResult.results[0].total;

    return Response.json({
      data: dataResult.results,
      meta: { total, limit, offset },
    });
  } catch (error) {
    const err = new Error("Company: Failed to list users");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * POST /api/company/users — Create a user and assign to the active store.
 * Requires admin role (admin or super_admin).
 */
export async function onRequestPost(context) {
  const { request, env, data } = context;

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
  if (!body.password?.trim() || body.password.length < 8) {
    return Response.json(
      {
        error: {
          message: "Password is required (min 8 characters)",
          code: "VALIDATION_FAILED",
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

    const id = generateUlid();
    const passwordHash = await hashPassword(body.password);
    // Company admins can only create user or admin roles, never super_admin
    const role = body.role === "admin" ? "admin" : "user";
    const locale = normaliseLocale(body.locale);
    const now = new Date().toISOString();

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO users (id, name, email, password, role, status, locale, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      ).bind(
        id,
        body.name.trim(),
        body.email.trim().toLowerCase(),
        passwordHash,
        role,
        locale,
        now,
        now,
      ),
      env.DB.prepare(
        `INSERT INTO store_users (store_id, user_id, role) VALUES (?, ?, ?)`,
      ).bind(result.storeId, id, role),
    ]);

    const newUser = await env.DB.prepare(
      "SELECT id, name, email, role, status, locale, created_at FROM users WHERE id = ?",
    )
      .bind(id)
      .first();

    return Response.json({ data: { user: newUser } }, { status: 201 });
  } catch (error) {
    const err = new Error("Company: Failed to create user");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
