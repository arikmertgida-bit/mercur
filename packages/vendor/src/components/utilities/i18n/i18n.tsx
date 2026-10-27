import i18n, { Resource } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import type { TranslationTree } from "../../../i18n/types";

import { defaultI18nOptions } from "../../../i18n/config";
import translations from "../../../i18n/translations";
import { installKayiZodErrorMap } from "../../../lib/zod-error-map";
import customI18nResources from "virtual:mercur/i18n";
import config from "virtual:mercur/config";

function deepMerge(
  target: TranslationTree,
  source: TranslationTree,
): TranslationTree {
  const result: TranslationTree = { ...target };

  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = target[key];

    result[key] =
      typeof sourceValue === "object" && typeof targetValue === "object"
        ? deepMerge(targetValue, sourceValue)
        : sourceValue;
  }

  return result;
}

// i18next keys resources by language; only object entries can be languages.
const toResource = (tree: TranslationTree): Resource =>
  Object.fromEntries(
    Object.entries(tree).flatMap(([language, namespaces]) =>
      typeof namespaces === "object" ? [[language, namespaces]] : [],
    ),
  );

const mergedTranslations = toResource(
  deepMerge(translations, customI18nResources),
);

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

  // `index.html`'deki statik `lang="en"` niteliği gerçek aktif dille
  // (varsayılan `tr`, ya da kullanıcının seçtiği herhangi bir dil) hiçbir
  // zaman senkron değildi — Chrome bunu içerikle (fiilen Türkçe render
  // edilen sayfa) karşılaştırıp "İngilizce sayfalar çevrilsin mi?" widget'ı
  // gösteriyordu. `document.documentElement.lang`'i i18next'in aktif
  // diliyle her zaman eşitle: ilk yüklemede ve her `changeLanguage()`
  // çağrısında.
  document.documentElement.lang = i18n.language;
  i18n.on("languageChanged", (lng) => {
    document.documentElement.lang = lng;
  });

  installKayiZodErrorMap();

  return null;
};

export { i18n };
