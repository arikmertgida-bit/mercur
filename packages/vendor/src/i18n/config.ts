import { InitOptions } from "i18next"

export const defaultI18nOptions: InitOptions = {
  debug: process.env.NODE_ENV === "development",
  detection: {
    // "header" is not a real i18next-browser-languagedetector detector name
    // (the library's registered detectors are: cookie, querystring,
    // localStorage, sessionStorage, navigator, htmlTag, path, subdomain —
    // verified against node_modules/i18next-browser-languagedetector source).
    // It silently no-ops, so a first-time visitor with no cookie/localStorage
    // never got their browser language detected and always fell back to
    // `fallbackLng`. "navigator" is the real detector for `navigator.language`
    // / `navigator.languages`; only "cookie"/"localStorage" are cacheable.
    caches: ["cookie", "localStorage"],
    lookupCookie: "lng",
    lookupLocalStorage: "lng",
    order: ["cookie", "localStorage", "navigator"],
  },
  fallbackLng: "en",
  fallbackNS: "translation",
  interpolation: {
    escapeValue: false,
  }
}
