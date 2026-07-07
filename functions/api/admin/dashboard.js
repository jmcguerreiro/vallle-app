/**
 * GET /api/admin/dashboard — Platform-level stats for super admin.
 * Returns total store count, total vallle sales, and subscription revenue
 * (sum of paid subscription periods), plus a monthly breakdown of vallle sales
 * and recognised subscription revenue for the requested year.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env } = context;

  const url = new URL(request.url);
  const year =
    url.searchParams.get("year") || new Date().getFullYear().toString();

  try {
    const [storesRow, valllesRow, revenueRow, monthlyVallles, monthlyRevenue] =
      await Promise.all([
        env.DB.prepare("SELECT COUNT(*) AS count FROM stores").first(),
        env.DB.prepare(
          "SELECT COALESCE(SUM(amount), 0) AS total FROM vallles",
        ).first(),
        env.DB.prepare(
          "SELECT COALESCE(SUM(amount), 0) AS total FROM subscription_periods WHERE paid_at IS NOT NULL",
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
          `SELECT strftime('%m', paid_at) AS month, SUM(amount) AS amount
           FROM subscription_periods
           WHERE paid_at IS NOT NULL AND strftime('%Y', paid_at) = ?
           GROUP BY strftime('%m', paid_at)`,
        )
          .bind(year)
          .all(),
      ]);

    const valllesByMonth = Object.fromEntries(
      (monthlyVallles.results || []).map((r) => [r.month, r.amount]),
    );
    const revenueByMonth = Object.fromEntries(
      (monthlyRevenue.results || []).map((r) => [r.month, r.amount]),
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
      subscription_revenue: revenueByMonth[m] || 0,
    }));

    return Response.json({
      data: {
        storeCount: storesRow.count,
        totalVallleAmount: valllesRow.total,
        totalSubscriptionRevenue: revenueRow.total,
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
