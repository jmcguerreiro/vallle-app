/**
 * GET /api/admin/commissions/:storeId — Monthly commission breakdown for a store (super_admin only).
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { env, params } = context;
  const { storeId } = params;

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

    const { results: months } = await env.DB.prepare(
      `SELECT strftime('%Y-%m', c.created_at) AS year_month,
              COUNT(c.id) AS commission_count,
              COALESCE(SUM(c.amount), 0) AS total_commission,
              SUM(CASE WHEN c.paid_at IS NOT NULL THEN 1 ELSE 0 END) AS paid_count,
              SUM(CASE WHEN c.paid_at IS NULL THEN 1 ELSE 0 END) AS unpaid_count,
              COALESCE(SUM(CASE WHEN c.paid_at IS NULL THEN c.amount ELSE 0 END), 0) AS unpaid_amount,
              COALESCE(SUM(CASE WHEN c.paid_at IS NOT NULL THEN c.amount ELSE 0 END), 0) AS paid_amount
       FROM commissions c
       WHERE c.store_id = ?
       GROUP BY year_month
       ORDER BY year_month DESC`,
    )
      .bind(storeId)
      .all();

    const summary = await env.DB.prepare(
      `SELECT COALESCE(SUM(c.amount), 0) AS total_commission,
              COALESCE(SUM(CASE WHEN c.paid_at IS NOT NULL THEN c.amount ELSE 0 END), 0) AS total_paid,
              COALESCE(SUM(CASE WHEN c.paid_at IS NULL THEN c.amount ELSE 0 END), 0) AS total_unpaid
       FROM commissions c
       WHERE c.store_id = ?`,
    )
      .bind(storeId)
      .first();

    return Response.json({ data: { store, summary, months } });
  } catch (error) {
    const err = new Error("Admin: Failed to get store commissions");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}
