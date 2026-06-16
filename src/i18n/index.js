import { initReactI18next } from "react-i18next";

import i18n from "i18next";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/constants/locales";

import en from "./en.json";
import pt from "./pt.json";

const LANGUAGE_KEY = "vallle_language";

/**
 * Resolves the initial UI language, in priority order:
 * 1. A `locale` URL param (e.g. an unauthenticated visitor arriving from the
 *    marketing site at `/login?locale=en`). Persisted so it survives the
 *    multi-page auth flow (login → forgot-password → …).
 * 2. The previously persisted preference.
 * 3. Portuguese (default).
 *
 * An authenticated user's stored locale takes over after login — see
 * `applyUserLocale` in `contexts/auth.jsx`.
 * @returns {string}
 */
function resolveInitialLanguage() {
  const fromUrl = new URLSearchParams(globalThis.location?.search).get(
    "locale",
  );
  if (SUPPORTED_LOCALES.has(fromUrl)) {
    globalThis.localStorage?.setItem(LANGUAGE_KEY, fromUrl);
    return fromUrl;
  }

  const saved = globalThis.localStorage?.getItem(LANGUAGE_KEY);
  return SUPPORTED_LOCALES.has(saved) ? saved : DEFAULT_LOCALE;
}

i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
    en: { translation: en },
  },
  lng: resolveInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export { default } from "i18next";
