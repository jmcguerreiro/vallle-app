/**
 * Vallle status constants for the Vallle app.
 * These are the display statuses surfaced by `deriveVallleStatus`. Some are
 * raw `status` column values and some are derived:
 *
 * - ACTIVE: Raw column value. The default on creation; has balance remaining
 *   and is not expired or archived.
 * - USED: Raw column value, system-managed. Set on the `status` column when a
 *   redemption brings the balance to 0 (see `redeem.js`); it cannot be set
 *   manually and is preserved across edits. `deriveVallleStatus` also derives
 *   it from `balance === 0` for display.
 * - EXPIRED: Derived only — computed from `expires_at < now`. Never stored;
 *   takes precedence over a raw `used`/`active` status at display time.
 * - ARCHIVED: Raw column value, set manually.
 *
 * So the raw `status` column is one of `active` / `used` / `archived`. When
 * filtering the list by these values on the API, treat anything that isn't
 * `archived` as a candidate and derive used/expired/active from
 * `balance`/`expires_at` — matching `deriveVallleStatus` (see
 * `functions/api/vallles/index.js`).
 */
export const VALLLE_STATUSES = {
  ACTIVE: "active",
  USED: "used",
  EXPIRED: "expired",
  ARCHIVED: "archived",
};

/**
 * Pseudo-status used by the list filter to show every vallle
 * regardless of status. Not a real status value.
 */
export const VALLLE_STATUS_ALL = "all";
