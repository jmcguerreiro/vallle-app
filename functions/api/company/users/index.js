import { buildLikePattern, parseListQuery } from "../../_list.js";
import { normaliseLocale } from "../../_locales.js";
import { generateUlid } from "../../_ulid.js";
import { isStrongPassword, isValidEmail } from "../../_validation.js";
import { hashPassword } from "../../auth/_helpers.js";

/**
 * GET /api/company/users — List users for the active store.
 * role/status are store-scoped (from store_users). Server-side pagination,
 * search (name/email), sort, and status filter. Store-admin only (enforced by
 * the directory middleware, which also resolves `context.data.store`).
 */
export async function onRequestGet(context) {
  const { request, env, data } = context;
  const { storeId } = data.store;

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
    const params = [storeId];

    if (search) {
      const like = buildLikePattern(search);
      where.push(
        String.raw`(u.name LIKE ? ESCAPE '\' OR u.email LIKE ? ESCAPE '\')`,
      );
      params.push(like, like);
    }

    if (status !== "all") {
      where.push("su.status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const fromSql = "FROM store_users su JOIN users u ON u.id = su.user_id";

    const [countResult, dataResult] = await env.DB.batch([
      env.DB.prepare(
        `SELECT COUNT(*) AS total ${fromSql} WHERE ${whereSql}`,
      ).bind(...params),
      env.DB.prepare(
        `SELECT u.id, u.name, u.email, su.role AS role, su.status AS status,
                u.created_at, u.updated_at
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
 * The account is created with a non-privileged account role; the store role and
 * an active membership are recorded on store_users. Store-admin only.
 */
export async function onRequestPost(context) {
  const { request, env, data } = context;
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

    const id = generateUlid();
    const passwordHash = await hashPassword(body.password);
    // Account role is non-privileged; the store role lives on store_users.
    // Company admins can only grant the user or admin store role.
    const storeRole = body.role === "admin" ? "admin" : "user";
    const locale = normaliseLocale(body.locale);
    const now = new Date().toISOString();

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO users (id, name, email, password, role, status, locale, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'user', 'active', ?, ?, ?)`,
      ).bind(
        id,
        body.name.trim(),
        body.email.trim().toLowerCase(),
        passwordHash,
        locale,
        now,
        now,
      ),
      env.DB.prepare(
        `INSERT INTO store_users (id, store_id, user_id, role, status, created_at)
         VALUES (?, ?, ?, ?, 'active', ?)`,
      ).bind(generateUlid(), storeId, id, storeRole, now),
    ]);

    const newUser = await env.DB.prepare(
      `SELECT u.id, u.name, u.email, su.role AS role, su.status AS status,
              u.locale, u.created_at
       FROM users u
       JOIN store_users su ON su.user_id = u.id AND su.store_id = ?
       WHERE u.id = ?`,
    )
      .bind(storeId, id)
      .first();

    return Response.json({ data: { user: newUser } }, { status: 201 });
  } catch (error) {
    const err = new Error("Company: Failed to create user");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
