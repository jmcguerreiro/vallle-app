/**
 * GET /api/admin/commissions/:storeId/:yearMonth
 * Per-vallle commission breakdown for a store in a given month (super_admin only).
 * yearMonth format: YYYY-MM (e.g. "2026-03")
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { env, params } = context;
  const { storeId, yearMonth } = params;

  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return Response.json(
      {
        error: {
          message: "Invalid year-month format. Expected YYYY-MM.",
          code: "VALIDATION_FAILED",
        },
      },
      { status: 400 },
    );
  }

  try {
    const store = await env.DB.prepare(
      "SELECT id, name FROM stores WHERE id = ?",
    )
      .bind(storeId)
      .first();

    if (!store) {
      return Response.json(
        { error: { message: "Store not found", code: "STORE_NOT_FOUND" } },
        { status: 404 },
      );
    }

    const { results: commissions } = await env.DB.prepare(
      `SELECT c.id,
              c.amount AS commission_amount,
              c.paid_at,
              c.created_at,
              v.code AS vallle_code,
              v.buyer AS vallle_buyer,
              v.amount AS vallle_amount
       FROM commissions c
       JOIN vallles v ON v.id = c.vallle_id
       WHERE c.store_id = ?
         AND strftime('%Y-%m', c.created_at) = ?
       ORDER BY c.created_at DESC`,
    )
      .bind(storeId, yearMonth)
      .all();

    const summary = await env.DB.prepare(
      `SELECT COUNT(c.id) AS commission_count,
              COALESCE(SUM(c.amount), 0) AS total_commission,
              SUM(CASE WHEN c.paid_at IS NULL THEN 1 ELSE 0 END) AS unpaid_count,
              COALESCE(SUM(CASE WHEN c.paid_at IS NULL THEN c.amount ELSE 0 END), 0) AS unpaid_amount
       FROM commissions c
       WHERE c.store_id = ?
         AND strftime('%Y-%m', c.created_at) = ?`,
    )
      .bind(storeId, yearMonth)
      .first();

    return Response.json({
      data: { store, year_month: yearMonth, summary, commissions },
    });
  } catch (error) {
    const err = new Error("Admin: Failed to get month commission breakdown");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * PATCH /api/admin/commissions/:storeId/:yearMonth
 * Mark all unpaid commissions for a store in a given month as paid (super_admin only).
 * yearMonth format: YYYY-MM (e.g. "2026-03")
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPatch(context) {
  const { env, params } = context;
  const { storeId, yearMonth } = params;

  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return Response.json(
      {
        error: {
          message: "Invalid year-month format. Expected YYYY-MM.",
          code: "VALIDATION_FAILED",
        },
      },
      { status: 400 },
    );
  }

  try {
    const store = await env.DB.prepare("SELECT id FROM stores WHERE id = ?")
      .bind(storeId)
      .first();

    if (!store) {
      return Response.json(
        { error: { message: "Store not found", code: "STORE_NOT_FOUND" } },
        { status: 404 },
      );
    }

    const paidAt = new Date().toISOString();

    const result = await env.DB.prepare(
      `UPDATE commissions
       SET paid_at = ?
       WHERE store_id = ?
         AND strftime('%Y-%m', created_at) = ?
         AND paid_at IS NULL`,
    )
      .bind(paidAt, storeId, yearMonth)
      .run();

    return Response.json({
      data: { updated: result.meta?.changes ?? 0, paid_at: paidAt },
    });
  } catch (error) {
    const err = new Error("Admin: Failed to mark month as paid");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
