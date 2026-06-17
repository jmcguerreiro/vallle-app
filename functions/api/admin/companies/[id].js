const STORE_SELECT = `SELECT id, name, slug, category, email, vat_id, phone, address1, address2, city, postal_code, region, country, default_vallle_expiry_days, status, created_at FROM stores WHERE id = ?`;

const EDITABLE_FIELDS = [
  "name",
  "category",
  "email",
  "vat_id",
  "phone",
  "address1",
  "address2",
  "city",
  "postal_code",
  "region",
  "country",
];

/**
 * GET /api/admin/companies/:id — Get a single store with stats (super_admin only).
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { env, params } = context;
  const { id } = params;

  try {
    const store = await env.DB.prepare(STORE_SELECT).bind(id).first();

    if (!store) {
      return Response.json(
        { error: { message: "Company not found", code: "COMPANY_NOT_FOUND" } },
        { status: 404 },
      );
    }

    const [vallleStats, commissionStats] = await env.DB.batch([
      env.DB.prepare(
        `SELECT COUNT(*) AS vallle_count,
                COALESCE(SUM(amount), 0) AS total_vallle_amount
         FROM vallles WHERE store_id = ?`,
      ).bind(id),
      env.DB.prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total_commission,
                COALESCE(SUM(CASE WHEN paid_at IS NULL THEN amount ELSE 0 END), 0) AS unpaid_commission
         FROM commissions WHERE store_id = ?`,
      ).bind(id),
    ]);

    const stats = {
      ...vallleStats.results[0],
      ...commissionStats.results[0],
    };

    // role/status are store-scoped (store_users) — this is the store's view of
    // each member, not their account-level role/status.
    const { results: users } = await env.DB.prepare(
      `SELECT u.id, u.name, u.email, su.role AS role, su.status AS status
       FROM users u
       JOIN store_users su ON su.user_id = u.id
       WHERE su.store_id = ?`,
    )
      .bind(id)
      .all();

    return Response.json({ data: { store, stats, users } });
  } catch (error) {
    const err = new Error("Admin: Failed to get company");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * PUT /api/admin/companies/:id — Update a store (super_admin only).
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPut(context) {
  const { request, env, params } = context;
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

  if (!body.name || !body.name.trim()) {
    return Response.json(
      {
        error: {
          message: "Company name is required",
          code: "VALIDATION_FAILED",
        },
      },
      { status: 400 },
    );
  }

  try {
    const existing = await env.DB.prepare("SELECT id FROM stores WHERE id = ?")
      .bind(id)
      .first();
    if (!existing) {
      return Response.json(
        { error: { message: "Company not found", code: "COMPANY_NOT_FOUND" } },
        { status: 404 },
      );
    }

    // Status is updated only when provided (PUT must not blank it to ""). An
    // out-of-range value is coerced to a safe default.
    const VALID_STATUSES = ["active", "suspended", "inactive"];
    const statusUpdate =
      body.status === undefined
        ? null
        : VALID_STATUSES.includes(body.status)
          ? body.status
          : "active";

    // Validate default_vallle_expiry_days if provided
    if (body.default_vallle_expiry_days !== undefined) {
      const days = parseInt(body.default_vallle_expiry_days, 10);
      if (Number.isNaN(days) || days < 1 || days > 1825) {
        return Response.json(
          {
            error: {
              message: "Default expiry must be between 1 and 1825 days",
              code: "VALIDATION_FAILED",
            },
          },
          { status: 400 },
        );
      }
    }

    const columns = [...EDITABLE_FIELDS];
    const values = EDITABLE_FIELDS.map((f) =>
      (body[f] ?? "").toString().trim(),
    );
    if (statusUpdate !== null) {
      columns.push("status");
      values.push(statusUpdate);
    }

    const sets = columns.map((f) => `${f} = ?`).join(", ");
    const now = new Date().toISOString();

    const statements = [
      env.DB.prepare(
        `UPDATE stores SET ${sets}, updated_at = ? WHERE id = ?`,
      ).bind(...values, now, id),
    ];

    if (body.default_vallle_expiry_days !== undefined) {
      statements.push(
        env.DB.prepare(
          "UPDATE stores SET default_vallle_expiry_days = ?, updated_at = ? WHERE id = ?",
        ).bind(parseInt(body.default_vallle_expiry_days, 10), now, id),
      );
    }

    await env.DB.batch(statements);

    const store = await env.DB.prepare(STORE_SELECT).bind(id).first();

    return Response.json({ data: { store } });
  } catch (error) {
    const err = new Error("Admin: Failed to update company");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
