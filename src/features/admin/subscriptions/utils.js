import { PLANS } from "@/constants/plans";

/**
 * Adds one year to a `YYYY-MM-DD` date string.
 * @param {string} dateStr - Date in `YYYY-MM-DD` form
 * @returns {string} Same day the following year, `YYYY-MM-DD`
 */
export const plusOneYear = (dateStr) => {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
};

/**
 * Annual price of a plan as a `€X.XX` form value, or empty for custom.
 * @param {string} planId - Plan id
 * @returns {string}
 */
export const planAnnualValue = (planId) => {
  const cents = PLANS[planId]?.monthlyCents;
  return cents == null ? "" : ((cents * 12) / 100).toFixed(2);
};
