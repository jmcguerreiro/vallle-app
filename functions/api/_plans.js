/**
 * Subscription plan definitions (API side).
 *
 * Stores pay a flat annual subscription, tiered by how many vallles they sell
 * (issue) per year. Prices are net (ex-VAT) and shown as €X.99/mo but billed
 * annually — the billed amount is `monthlyCents * 12`. The tier is assigned at
 * renewal from the trailing-year count; it is never auto-bumped mid-period.
 *
 * `custom` is bespoke (1000+/yr) — no fixed price.
 */
export const PLANS = {
  starter: { id: "starter", monthlyCents: 499, vallleLimit: 50 },
  growth: { id: "growth", monthlyCents: 1299, vallleLimit: 300 },
  pro: { id: "pro", monthlyCents: 2999, vallleLimit: 1000 },
  custom: { id: "custom", monthlyCents: null, vallleLimit: null },
};

/** Ordered plan ids, cheapest → bespoke. */
export const PLAN_IDS = ["starter", "growth", "pro", "custom"];

/**
 * Annual (billed) price in cents for a plan, or null for custom.
 * @param {string} planId
 * @returns {number|null}
 */
export function planAnnualCents(planId) {
  const plan = PLANS[planId];
  if (!plan || plan.monthlyCents == null) return null;
  return plan.monthlyCents * 12;
}

/**
 * Suggested plan tier for a given yearly vallle count. Used to surface "this
 * store should renew on Growth" without changing their current plan.
 * @param {number} count - Vallles sold in the period
 * @returns {string} A plan id
 */
export function planForVallleCount(count) {
  if (count <= PLANS.starter.vallleLimit) return "starter";
  if (count <= PLANS.growth.vallleLimit) return "growth";
  if (count <= PLANS.pro.vallleLimit) return "pro";
  return "custom";
}
