/**
 * Shared helpers for subscription-period admin routes. All routes here are
 * gated to super_admin by functions/api/admin/_middleware.js.
 *
 * The subscription_periods history doubles as the subscription log — one row
 * per store per billing year, where created_at records when the renewal was
 * recorded and paid_at when it was paid. The store's `plan` and
 * `plan_renews_at` columns mirror the latest period; call
 * `syncStoreFromPeriods` after any period write so they never drift.
 */

import { normalizeDateInput } from "../../_dates.js";
import { PLAN_IDS } from "../../_plans.js";

/**
 * Reads a single subscription period.
 * @param {Object} env - Cloudflare env bindings
 * @param {string} id - Period ID
 * @returns {Promise<Object|null>}
 */
export async function getPeriod(env, id) {
  return env.DB.prepare("SELECT * FROM subscription_periods WHERE id = ?")
    .bind(id)
    .first();
}

/**
 * Validates a period `plan` value. Returns a 400 `Response` when
 * present-but-invalid, or `null` when absent or valid.
 * @param {unknown} value - Raw `body.plan`
 * @returns {Response|null}
 */
export function validatePeriodPlan(value) {
  if (value === undefined) return null;
  if (!PLAN_IDS.includes(value)) {
    return Response.json(
      { error: { message: "Invalid plan", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }
  return null;
}

/**
 * Validates a period `amount` value (net cents, non-negative integer).
 * Returns a 400 `Response` when present-but-invalid, or `null` when absent
 * or valid.
 * @param {unknown} value - Raw `body.amount`
 * @returns {Response|null}
 */
export function validatePeriodAmount(value) {
  if (value === undefined) return null;
  if (!Number.isInteger(value) || value < 0) {
    return Response.json(
      {
        error: {
          message: "Amount must be a non-negative integer in cents",
          code: "VALIDATION_FAILED",
        },
      },
      { status: 400 },
    );
  }
  return null;
}

/**
 * Validates that a period covers a positive range. Both values must already
 * be normalised ISO strings (see `normalizeDateInput`).
 * @param {string|null} start - Normalised period_start
 * @param {string|null} end - Normalised period_end
 * @returns {Response|null}
 */
export function validatePeriodRange(start, end) {
  if (!start || !end || end <= start) {
    return Response.json(
      {
        error: {
          message: "The period end must be after the period start",
          code: "VALIDATION_FAILED",
        },
      },
      { status: 400 },
    );
  }
  return null;
}

/**
 * Normalises an optional `paid_at` body value: absent stays absent
 * (`undefined`), empty clears (`null`), a date-only string becomes a full
 * ISO timestamp.
 * @param {unknown} value - Raw `body.paid_at`
 * @returns {string|null|undefined}
 */
export function normalizePaidAt(value) {
  if (value === undefined) return;
  return normalizeDateInput(value);
}

/**
 * Mirrors the store's `plan` and `plan_renews_at` from its latest
 * subscription period (by period_end), so the company list/detail always
 * reflect the period ledger. With no periods left, only the renewal date is
 * cleared — the store keeps its current plan.
 * @param {Object} env - Cloudflare env bindings
 * @param {string} storeId - Store ID
 * @returns {Promise<void>}
 */
export async function syncStoreFromPeriods(env, storeId) {
  const now = new Date().toISOString();

  const latest = await env.DB.prepare(
    `SELECT plan, period_end FROM subscription_periods
     WHERE store_id = ? ORDER BY period_end DESC LIMIT 1`,
  )
    .bind(storeId)
    .first();

  const statement = latest
    ? env.DB.prepare(
        "UPDATE stores SET plan = ?, plan_renews_at = ?, updated_at = ? WHERE id = ?",
      ).bind(latest.plan, latest.period_end, now, storeId)
    : env.DB.prepare(
        "UPDATE stores SET plan_renews_at = NULL, updated_at = ? WHERE id = ?",
      ).bind(now, storeId);

  await statement.run();
}
