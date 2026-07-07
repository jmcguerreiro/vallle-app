import { planForVallleCount } from "../../_plans.js";
import {
  STORE_SELECT,
  buildStoreUpdate,
  validateStoreExpiryDays,
  validateStoreMinRedemption,
  validateStorePlan,
  validateStoreStatus,
} from "../../_store.js";

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

    // "This period" = trailing 365 days (matches the subscription tier metric).
    const periodStart = new Date(Date.now() - 365 * 86_400_000).toISOString();

    const [vallleStats, subSummary, valllesPeriodRow, periodsResult] =
      await env.DB.batch([
        env.DB.prepare(
          `SELECT COUNT(*) AS vallle_count,
                  COALESCE(SUM(amount), 0) AS total_vallle_amount
           FROM vallles WHERE store_id = ?`,
        ).bind(id),
        env.DB.prepare(
          `SELECT COALESCE(SUM(amount), 0) AS total_billed,
                  COALESCE(SUM(CASE WHEN paid_at IS NOT NULL THEN amount ELSE 0 END), 0) AS total_paid,
                  COALESCE(SUM(CASE WHEN paid_at IS NULL THEN amount ELSE 0 END), 0) AS total_unpaid
           FROM subscription_periods WHERE store_id = ?`,
        ).bind(id),
        env.DB.prepare(
          "SELECT COUNT(*) AS vallles_period FROM vallles WHERE store_id = ? AND created_at >= ?",
        ).bind(id, periodStart),
        env.DB.prepare(
          `SELECT id, plan, period_start, period_end, amount, vallles_sold, paid_at, created_at
           FROM subscription_periods WHERE store_id = ?
           ORDER BY period_start DESC`,
        ).bind(id),
      ]);

    const summary = subSummary.results[0];
    const valllesPeriod = valllesPeriodRow.results[0].vallles_period;

    const stats = {
      ...vallleStats.results[0],
      total_subscription: summary.total_billed,
      unpaid_subscription: summary.total_unpaid,
    };

    const subscription = {
      summary,
      vallles_period: valllesPeriod,
      suggested_plan: planForVallleCount(valllesPeriod),
      periods: periodsResult.results,
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

    return Response.json({ data: { store, stats, subscription, users } });
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

    const expiryError = validateStoreExpiryDays(
      body.default_vallle_expiry_days,
    );
    if (expiryError) return expiryError;

    const statusError = validateStoreStatus(body.status);
    if (statusError) return statusError;

    const planError = validateStorePlan(body.plan);
    if (planError) return planError;

    const minRedemptionError = validateStoreMinRedemption(body);
    if (minRedemptionError) return minRedemptionError;

    const { sets, values } = buildStoreUpdate(body, {
      allowStatus: true,
      allowPlan: true,
    });
    const now = new Date().toISOString();

    await env.DB.prepare(
      `UPDATE stores SET ${sets}, updated_at = ? WHERE id = ?`,
    )
      .bind(...values, now, id)
      .run();

    const store = await env.DB.prepare(STORE_SELECT).bind(id).first();

    return Response.json({ data: { store } });
  } catch (error) {
    const err = new Error("Admin: Failed to update company");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
