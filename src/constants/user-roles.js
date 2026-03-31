/**
 * User role constants for the Vallle app.
 * Matches the `role` column on the `users` table.
 *
 * - SUPER_ADMIN: Platform owner — full access to all admin tools.
 * - ADMIN: Store owner/manager — can manage company details and users.
 * - USER: Store staff — same as admin minus user management.
 */
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
}
