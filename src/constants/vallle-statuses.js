/**
 * Vallle status constants for the Vallle app.
 * These are the derived display statuses (see `deriveVallleStatus`),
 * not raw `status` column values — `EXPIRED` and `USED` are computed
 * from `expires_at` and `balance`.
 *
 * - ACTIVE: Has balance remaining and not expired or archived.
 * - USED: Balance fully redeemed (balance === 0).
 * - EXPIRED: Past its `expires_at` date.
 * - ARCHIVED: Manually archived (raw `status` column value).
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
