import { InitOptions } from "i18next"

import translations from "./translations"

export const defaultI18nOptions: InitOptions = {
  debug: process.env.NODE_ENV === "development",
  detection: {
    // Same bug/fix as packages/vendor/src/i18n/config.ts — "header" is not a
    // real i18next-browser-languagedetector detector name, so it silently
    // no-ops and first-time visitors never got browser-language detection.
    caches: ["cookie", "localStorage"],
    lookupCookie: "lng",
    lookupLocalStorage: "lng",
    order: ["cookie", "localStorage", "navigator"],
  },
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  resources: translations,
  supportedLngs: Object.keys(translations),
}
