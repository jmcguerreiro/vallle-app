import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useQueryClient } from "@tanstack/react-query";

import { COMPANY_STATUSES } from "@/constants/company-statuses";
import { SUPPORTED_LOCALES } from "@/constants/locales";
import { ACCOUNT_ROLES, STORE_ROLES } from "@/constants/user-roles";
import i18n from "@/i18n";
import { get, post, setApiStoreId } from "@/services/api";

export const AuthContext = createContext(null);

const STORE_KEY = "vallle_active_store";
const LANGUAGE_KEY = "vallle_language";

/**
 * Applies an authenticated user's saved locale to the UI: the DB value is the
 * source of truth for a logged-in user, so we sync i18next and the persisted
 * language preference to it on login and session restore.
 * @param {string} [locale]
 */
function applyUserLocale(locale) {
  if (!SUPPORTED_LOCALES.has(locale)) return;
  if (i18n.language !== locale) i18n.changeLanguage(locale);
  localStorage.setItem(LANGUAGE_KEY, locale);
}

/**
 * Reads the persisted active store ID from localStorage for a given user.
 * @param {string} userId
 * @returns {string|null}
 */
function getSavedStoreId(userId) {
  if (!userId) return null;
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return parsed.userId === userId ? parsed.storeId : null;
  } catch {
    return null;
  }
}

/**
 * Persists the active store ID to localStorage, scoped to a user.
 * @param {string} userId
 * @param {string} storeId
 */
function saveStoreId(userId, storeId) {
  localStorage.setItem(STORE_KEY, JSON.stringify({ userId, storeId }));
}

/**
 * Provides authentication state to the app.
 * On mount, checks for an existing session via /api/auth/me.
 * Exposes login, logout, current user, and active store via AuthContext.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export const AuthProvider = ({ children }) => {
  // Hooks
  const queryClient = useQueryClient();

  // State
  const [user, setUser] = useState(null);
  const [activeStore, setActiveStoreState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refs
  const userIdRef = useRef(null);

  // Handlers
  const login = useCallback(async (email, password) => {
    const { data } = await post("/api/auth/login", { email, password });
    setUser(data.user);
    userIdRef.current = data.user.id;
    applyUserLocale(data.user.locale);

    // Super admins operate platform-wide and have no active store.
    // For everyone else: auto-select store if the user has exactly one;
    // multi-store users always get the picker after login.
    if (data.user.role === ACCOUNT_ROLES.SUPER_ADMIN) {
      setActiveStoreState(null);
      setApiStoreId(null);
    } else if (data.user.stores?.length === 1) {
      const store = data.user.stores[0];
      setActiveStoreState(store);
      setApiStoreId(store.store_id);
      saveStoreId(data.user.id, store.store_id);
    } else {
      setActiveStoreState(null);
      setApiStoreId(null);
    }

    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await post("/api/auth/logout");
    setUser(null);
    setActiveStoreState(null);
    setApiStoreId(null);
    userIdRef.current = null;
    // Wipe all cached server data so the next account that logs in on this
    // browser can't see the previous user's data (query keys like ["profile"]
    // are global, not user-scoped).
    queryClient.clear();
  }, [queryClient]);

  const selectStore = useCallback((store) => {
    setApiStoreId(store?.store_id || null);
    if (userIdRef.current && store?.store_id) {
      saveStoreId(userIdRef.current, store.store_id);
    }
    // Hard reload to guarantee a clean slate for the new store. Query keys are
    // store-agnostic (the store is only carried in the X-Store-Id header), so an
    // in-app switch would otherwise serve the previous store's cached data. The
    // reloaded app re-hydrates the active store from localStorage on mount.
    globalThis.location.assign("/");
  }, []);

  // Effects
  useEffect(() => {
    get("/api/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        userIdRef.current = data.user.id;
        applyUserLocale(data.user.locale);

        // Super admins operate platform-wide and have no active store.
        if (data.user.role === ACCOUNT_ROLES.SUPER_ADMIN) {
          setActiveStoreState(null);
          setApiStoreId(null);
        } else if (data.user.stores?.length === 1) {
          const store = data.user.stores[0];
          setActiveStoreState(store);
          setApiStoreId(store.store_id);
          saveStoreId(data.user.id, store.store_id);
        } else {
          const savedId = getSavedStoreId(data.user.id);
          const match = data.user.stores?.find((s) => s.store_id === savedId);
          if (match) {
            setActiveStoreState(match);
            setApiStoreId(match.store_id);
          }
        }
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  // Derived State
  const needsStoreSelection =
    !!user && (user.stores?.length ?? 0) > 1 && !activeStore;

  // A suspended store is read-only (no new vallles). Suspension is a store-level
  // state set by the super_admin — memberships are only active/inactive.
  const isStoreSuspended =
    activeStore?.store_status === COMPANY_STATUSES.SUSPENDED;

  const value = useMemo(
    () => ({
      user,
      setUser,
      isLoading,
      login,
      logout,
      activeStore,
      selectStore,
      needsStoreSelection,
      isAuthenticated: !!user,
      isSuperAdmin: user?.role === ACCOUNT_ROLES.SUPER_ADMIN,
      // Store admin is store-scoped: admin of the active store, or a platform
      // super_admin (who is implicitly an admin everywhere).
      isAdmin:
        user?.role === ACCOUNT_ROLES.SUPER_ADMIN ||
        activeStore?.role === STORE_ROLES.ADMIN,
      isStoreSuspended,
    }),
    [
      user,
      isLoading,
      login,
      logout,
      activeStore,
      selectStore,
      needsStoreSelection,
      isStoreSuspended,
    ],
  );

  // Render
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
