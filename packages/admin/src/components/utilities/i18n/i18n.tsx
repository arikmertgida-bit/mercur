import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import { defaultI18nOptions } from "../../../i18n/config";
import translations from "../../../i18n/translations";
import customI18nResources from "virtual:mercur/i18n";
import config from "virtual:mercur/config";

function deepMerge(
  target: Record<string, any>,
  source: Record<string, any>,
): Record<string, any> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

const mergedTranslations = deepMerge(translations, customI18nResources);

export const I18n = () => {
  if (i18n.isInitialized) {
    return null;
  }

  i18n
    .use(
      new LanguageDetector(null, {
        lookupCookie: "lng",
        lookupLocalStorage: "lng",
      }),
    )
    .use(initReactI18next)
    .init({
      ...defaultI18nOptions,
      // A `defaultLanguage` config is the panel's fallback for sessions
      // where nothing was detected (no cookie/localStorage/header match) —
      // NOT a forced `lng`. Setting `lng` directly would make i18next skip
      // the LanguageDetector entirely, permanently overriding every user's
      // own saved language choice with this default.
      ...(config.i18n?.defaultLanguage && {
        fallbackLng: config.i18n.defaultLanguage,
      }),
      resources: mergedTranslations,
    });

  // `index.html`'deki statik `lang="en"` niteliği gerçek aktif dille hiçbir
  // zaman senkron değildi — tarayıcı bunu fiilen render edilen içerikle
  // karşılaştırıp "çevrilsin mi?" widget'ı gösterebiliyordu. Aynı düzeltme
  // vendor panelde de var (packages/vendor/.../i18n.tsx) — bkz. oradaki
  // yorum. `document.documentElement.lang`'i i18next'in aktif diliyle her
  // zaman eşitle: ilk yüklemede ve her `changeLanguage()` çağrısında.
  document.documentElement.lang = i18n.language;
  i18n.on("languageChanged", (lng) => {
    document.documentElement.lang = lng;
  });

  return null;
};

export { i18n };
