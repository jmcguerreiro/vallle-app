/**
 * Role constants for the Vallle app. Roles live in two distinct scopes — keep
 * them separate so "admin" is never ambiguous:
 *
 * - ACCOUNT_ROLES (`users.role`) — platform scope. Only the platform owner
 *   (SUPER_ADMIN, a sysadmin) is special; everyone else is a plain USER. The
 *   admin/user distinction does NOT exist here — it's store-scoped.
 * - STORE_ROLES (`store_users.role`) — what a user can do within a single store.
 *   ADMIN manages the store and its members; USER is store staff.
 *
 * A user can be a plain platform account yet ADMIN of their store, and the same
 * account can be ADMIN in one store and USER in another.
 */
export const ACCOUNT_ROLES = {
  USER: "user",
  SUPER_ADMIN: "super_admin",
};

export const STORE_ROLES = {
  USER: "user",
  ADMIN: "admin",
};
