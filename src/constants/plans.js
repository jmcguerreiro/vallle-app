/**
 * Subscription plan definitions (client side — mirror of functions/api/_plans.js).
 *
 * Stores pay a flat annual subscription, tiered by vallles sold per year. Prices
 * are net (ex-VAT), displayed as €X.99/mo but billed annually. Plan labels are
 * internationalised under `constants.plans.*`; this module holds the numbers.
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
 * Suggested plan tier for a given yearly vallle count.
 * @param {number} count - Vallles sold in the period
 * @returns {string} A plan id
 */
export const planForVallleCount = (count) => {
  if (count <= PLANS.starter.vallleLimit) return "starter";
  if (count <= PLANS.growth.vallleLimit) return "growth";
  if (count <= PLANS.pro.vallleLimit) return "pro";
  return "custom";
};
