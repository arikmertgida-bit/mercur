import type { JsonRecord } from "@mercurjs/types";
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import { defaultI18nOptions } from "../../../i18n/config";
import translations from "../../../i18n/translations";
import customI18nResources from "virtual:mercur/i18n";
import config from "virtual:mercur/config";

import { isJsonObject } from "../../../lib/json";

function deepMerge(target: JsonRecord, source: JsonRecord): JsonRecord {
  const result: JsonRecord = { ...target };

  for (const [key, value] of Object.entries(source)) {
    const current = target[key];

    result[key] =
      isJsonObject(value) && isJsonObject(current)
        ? deepMerge(current, value)
        : value;
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
      ...(config.i18n?.defaultLanguage && {
        lng: config.i18n.defaultLanguage,
      }),
      resources: mergedTranslations,
    });

  return null;
};

export { i18n };
