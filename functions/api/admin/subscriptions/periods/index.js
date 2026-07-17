import { normalizeDateInput } from "../../../_dates.js";
import { generateUlid } from "../../../_ulid.js";
import {
  getPeriod,
  normalizePaidAt,
  syncStoreFromPeriods,
  validatePeriodAmount,
  validatePeriodPlan,
  validatePeriodRange,
} from "../_helpers.js";

/**
 * POST /api/admin/subscriptions/periods — Record a subscription period for a
 * store: the first period at signup or a renewal (super_admin only).
 *
 * Body: `{ store_id, plan, period_start, period_end, amount, paid_at?,
 * notes? }` — amount is net cents. The renewal anniversary is the client's
 * concern: the form pre-fills period_start with the previous period_end so
 * paying early never shifts the year. `vallles_sold` is snapshotted
 * server-side as the count of vallles issued in the 365 days before
 * period_start (the number that set the tier). The store's
 * plan/plan_renews_at are synced from the ledger afterwards.
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

  if (!body.store_id) {
    return Response.json(
      { error: { message: "Store is required", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }

  if (body.plan === undefined) {
    return Response.json(
      { error: { message: "A plan is required", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }
  const planError = validatePeriodPlan(body.plan);
  if (planError) return planError;

  if (body.amount === undefined) {
    return Response.json(
      {
        error: { message: "An amount is required", code: "VALIDATION_FAILED" },
      },
      { status: 400 },
    );
  }
  const amountError = validatePeriodAmount(body.amount);
  if (amountError) return amountError;

  const periodStart = normalizeDateInput(body.period_start);
  const periodEnd = normalizeDateInput(body.period_end);
  const rangeError = validatePeriodRange(periodStart, periodEnd);
  if (rangeError) return rangeError;

  const paidAt = normalizePaidAt(body.paid_at) ?? null;
  const notes = (body.notes ?? "").toString().trim();

  try {
    const store = await env.DB.prepare("SELECT id FROM stores WHERE id = ?")
      .bind(body.store_id)
      .first();
    if (!store) {
      return Response.json(
        { error: { message: "Store not found", code: "STORE_NOT_FOUND" } },
        { status: 404 },
      );
    }

    // Snapshot of the trailing-year count at the period start — the number
    // that set the tier. Zero for a brand-new store's first period.
    const trailingStart = new Date(
      new Date(periodStart).getTime() - 365 * 86_400_000,
    ).toISOString();
    const { vallles_sold: valllesSold } = await env.DB.prepare(
      `SELECT COUNT(*) AS vallles_sold FROM vallles
       WHERE store_id = ? AND created_at >= ? AND created_at < ?`,
    )
      .bind(body.store_id, trailingStart, periodStart)
      .first();

    const id = generateUlid();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO subscription_periods
         (id, store_id, plan, period_start, period_end, amount, vallles_sold, paid_at, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        body.store_id,
        body.plan,
        periodStart,
        periodEnd,
        body.amount,
        valllesSold,
        paidAt,
        notes,
        now,
        now,
      )
      .run();

    await syncStoreFromPeriods(env, body.store_id);

    const period = await getPeriod(env, id);

    return Response.json({ data: { period } }, { status: 201 });
  } catch (error) {
    const err = new Error("Admin: Failed to create subscription period");
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
