import { InitOptions } from "i18next"

export const defaultI18nOptions: InitOptions = {
  debug: process.env.NODE_ENV === "development",
  detection: {
    // Manual language selection is the only source of truth — the panel must
    // never auto-switch based on the browser's Accept-Language / navigator
    // .language. "navigator" is deliberately excluded from `order` so a
    // first-time visitor with no prior selection always lands on
    // `fallbackLng` (below) instead of an implicit browser guess. A vendor's
    // explicit choice (login/register language selector, profile settings)
    // is written to `cookie`/`localStorage` via `i18n.changeLanguage()` and
    // is the only thing `order` is allowed to read back.
    caches: ["cookie", "localStorage"],
    lookupCookie: "lng",
    lookupLocalStorage: "lng",
    order: ["cookie", "localStorage"],
  },
  fallbackLng: "en",
  fallbackNS: "translation",
  interpolation: {
    escapeValue: false,
  }
}
