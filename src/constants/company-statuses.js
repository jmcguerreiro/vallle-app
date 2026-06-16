/**
 * Company status constants for the Vallle app.
 * Matches the `status` column on the `stores` table (surfaced as
 * `store_status` in the auth context and as "company" in the admin UI).
 *
 * - ACTIVE: Company is live and fully operational.
 * - SUSPENDED: Temporarily blocked — staff can sign in but actions are limited.
 * - INACTIVE: Company is deactivated.
 */
export const COMPANY_STATUSES = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  INACTIVE: "inactive",
};
