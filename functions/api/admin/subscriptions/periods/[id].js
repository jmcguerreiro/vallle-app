import { normalizeDateInput } from "../../../_dates.js";
import {
  getPeriod,
  normalizePaidAt,
  syncStoreFromPeriods,
  validatePeriodAmount,
  validatePeriodPlan,
  validatePeriodRange,
} from "../_helpers.js";

/**
 * GET /api/admin/subscriptions/periods/:id — Get a single subscription period
 * with its store name (super_admin only, gated by
 * functions/api/admin/_middleware.js). Also returns `is_first` — whether this
 * is the store's earliest period (only a first billing year may have its
 * start date moved; every later start is anchored to the previous period).
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { env, params } = context;
  const { id } = params;

  try {
    const period = await env.DB.prepare(
      `SELECT p.*, s.name AS store_name
       FROM subscription_periods p
       JOIN stores s ON s.id = p.store_id
       WHERE p.id = ?`,
    )
      .bind(id)
      .first();

    if (!period) {
      return Response.json(
        {
          error: {
            message: "Subscription period not found",
            code: "SUBSCRIPTION_PERIOD_NOT_FOUND",
          },
        },
        { status: 404 },
      );
    }

    const { earlier } = await env.DB.prepare(
      `SELECT COUNT(*) AS earlier FROM subscription_periods
       WHERE store_id = ? AND period_start < ?`,
    )
      .bind(period.store_id, period.period_start)
      .first();

    return Response.json({ data: { period, is_first: earlier === 0 } });
  } catch (error) {
    const err = new Error("Subscriptions: Failed to get subscription period");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * PATCH /api/admin/subscriptions/periods/:id — Mark a subscription period as
 * paid (today). Backdating a payment is done on the Edit form (PUT).
 * Gated to super_admin by functions/api/admin/_middleware.js.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestPatch(context) {
  const { env, params } = context;
  const { id } = params;

  try {
    const now = new Date().toISOString();

    // Atomic: only update if not already paid, avoids TOCTOU race.
    const result = await env.DB.prepare(
      "UPDATE subscription_periods SET paid_at = ?, updated_at = ? WHERE id = ? AND paid_at IS NULL",
    )
      .bind(now, now, id)
      .run();

    if (!result.meta.changes) {
      const existing = await env.DB.prepare(
        "SELECT id, paid_at FROM subscription_periods WHERE id = ?",
      )
        .bind(id)
        .first();

      if (!existing) {
        return Response.json(
          {
            error: {
              message: "Subscription period not found",
              code: "SUBSCRIPTION_PERIOD_NOT_FOUND",
            },
          },
          { status: 404 },
        );
      }

      return Response.json(
        {
          error: {
            message: "Subscription period is already marked as paid",
            code: "SUBSCRIPTION_PERIOD_ALREADY_PAID",
          },
        },
        { status: 409 },
      );
    }

    const period = await getPeriod(env, id);

    return Response.json({ data: period });
  } catch (error) {
    const err = new Error(
      "Subscriptions: Failed to mark subscription period as paid",
    );
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * PUT /api/admin/subscriptions/periods/:id — Update a subscription period
 * (super_admin only). Partial update: only fields present in the body are
 * written. `paid_at` is clearable (empty → back to unpaid) so a mistaken
 * mark-as-paid can be corrected. The store's plan/plan_renews_at are synced
 * from the ledger afterwards.
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

  const planError = validatePeriodPlan(body.plan);
  if (planError) return planError;

  const amountError = validatePeriodAmount(body.amount);
  if (amountError) return amountError;

  try {
    const existing = await getPeriod(env, id);
    if (!existing) {
      return Response.json(
        {
          error: {
            message: "Subscription period not found",
            code: "SUBSCRIPTION_PERIOD_NOT_FOUND",
          },
        },
        { status: 404 },
      );
    }

    // The range check runs on the effective values, so shrinking one end
    // can't cross the other.
    const periodStart =
      body.period_start === undefined
        ? existing.period_start
        : normalizeDateInput(body.period_start);
    const periodEnd =
      body.period_end === undefined
        ? existing.period_end
        : normalizeDateInput(body.period_end);
    const rangeError = validatePeriodRange(periodStart, periodEnd);
    if (rangeError) return rangeError;

    const columns = [];
    const values = [];

    if (body.plan !== undefined) {
      columns.push("plan");
      values.push(body.plan);
    }
    if (body.period_start !== undefined) {
      columns.push("period_start");
      values.push(periodStart);
    }
    if (body.period_end !== undefined) {
      columns.push("period_end");
      values.push(periodEnd);
    }
    if (body.amount !== undefined) {
      columns.push("amount");
      values.push(body.amount);
    }
    const paidAt = normalizePaidAt(body.paid_at);
    if (paidAt !== undefined) {
      columns.push("paid_at");
      values.push(paidAt);
    }
    if (body.notes !== undefined) {
      columns.push("notes");
      values.push((body.notes ?? "").toString().trim());
    }

    const now = new Date().toISOString();
    const sets = [...columns.map((f) => `${f} = ?`), "updated_at = ?"].join(
      ", ",
    );

    await env.DB.prepare(`UPDATE subscription_periods SET ${sets} WHERE id = ?`)
      .bind(...values, now, id)
      .run();

    await syncStoreFromPeriods(env, existing.store_id);

    const period = await getPeriod(env, id);

    return Response.json({ data: { period } });
  } catch (error) {
    const err = new Error(
      "Subscriptions: Failed to update subscription period",
    );
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}

/**
 * DELETE /api/admin/subscriptions/periods/:id — Delete an unpaid subscription
 * period (super_admin only) — for correcting a period recorded by mistake.
 * A paid period is part of the payment log and can't be deleted; clear its
 * paid date first (PUT) if it really has to go. The store's
 * plan/plan_renews_at are synced from the ledger afterwards.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestDelete(context) {
  const { env, params } = context;
  const { id } = params;

  try {
    const existing = await getPeriod(env, id);
    if (!existing) {
      return Response.json(
        {
          error: {
            message: "Subscription period not found",
            code: "SUBSCRIPTION_PERIOD_NOT_FOUND",
          },
        },
        { status: 404 },
      );
    }

    // Atomic guard: the paid check re-runs inside the DELETE.
    const result = await env.DB.prepare(
      "DELETE FROM subscription_periods WHERE id = ? AND paid_at IS NULL",
    )
      .bind(id)
      .run();

    if (!result.meta.changes) {
      return Response.json(
        {
          error: {
            message: "A paid subscription period cannot be deleted",
            code: "SUBSCRIPTION_PERIOD_PAID",
          },
        },
        { status: 409 },
      );
    }

    await syncStoreFromPeriods(env, existing.store_id);

    return Response.json({ data: { id } });
  } catch (error) {
    const err = new Error(
      "Subscriptions: Failed to delete subscription period",
    );
    err.code = "DB_WRITE_FAILED";
    err.cause = error;
    throw err;
  }
}
