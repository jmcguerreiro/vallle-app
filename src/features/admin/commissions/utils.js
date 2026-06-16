/**
 * Formats a YYYY-MM string into a human-readable month label.
 * @param {string} yearMonth - e.g. "2026-03"
 * @returns {string} e.g. "March 2026"
 */
export function formatYearMonth(yearMonth) {
  const [year, month] = yearMonth.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
