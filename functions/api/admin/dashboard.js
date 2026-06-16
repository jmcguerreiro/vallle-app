/**
 * GET /api/admin/dashboard — Platform-level stats for super admin.
 * Returns total store count, vallle count, and total commission revenue.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env } = context;

  const url = new URL(request.url);
  const year =
    url.searchParams.get("year") || new Date().getFullYear().toString();

  try {
    const [
      storesRow,
      valllesRow,
      commissionsRow,
      monthlyVallles,
      monthlyCommissions,
    ] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS count FROM stores").first(),
      env.DB.prepare(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM vallles",
      ).first(),
      env.DB.prepare(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM commissions",
      ).first(),
      env.DB.prepare(
        `SELECT strftime('%m', created_at) AS month, SUM(amount) AS amount
         FROM vallles
         WHERE strftime('%Y', created_at) = ?
         GROUP BY strftime('%m', created_at)`,
      )
        .bind(year)
        .all(),
      env.DB.prepare(
        `SELECT strftime('%m', created_at) AS month, SUM(amount) AS amount
         FROM commissions
         WHERE strftime('%Y', created_at) = ?
         GROUP BY strftime('%m', created_at)`,
      )
        .bind(year)
        .all(),
    ]);

    const valllesByMonth = Object.fromEntries(
      (monthlyVallles.results || []).map((r) => [r.month, r.amount]),
    );
    const commissionsByMonth = Object.fromEntries(
      (monthlyCommissions.results || []).map((r) => [r.month, r.amount]),
    );

    const months = [
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
    ];
    const chartData = months.map((m) => ({
      month: `${year}-${m}`,
      vallle_amount: valllesByMonth[m] || 0,
      commission_amount: commissionsByMonth[m] || 0,
    }));

    return Response.json({
      data: {
        storeCount: storesRow.count,
        totalVallleAmount: valllesRow.total,
        totalCommission: commissionsRow.total,
        chartData,
      },
    });
  } catch (error) {
    const err = new Error("Admin Dashboard: Failed to fetch stats");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}
