import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { PropsWithChildren, useSyncExternalStore } from "react";
import { initReactI18next } from "react-i18next";

import { createTranslationBackend } from "../../../i18n/backend";
import { defaultI18nOptions } from "../../../i18n/config";
import { languages } from "../../../i18n/languages";
import { installKayiZodErrorMap } from "../../../lib/zod-error-map";
import customI18nResources, {
  translationLoaders as appTranslationLoaders,
} from "virtual:mercur/i18n";
import config from "virtual:mercur/config";

/**
 * Mirrors the active panel language onto `<html>`: `lang` for the browser
 * (no false "translate this page?" prompt) and `dir` so ar/fa/he render
 * right-to-left. `dir` comes from the `ltr` flag in `i18n/languages`; Radix
 * menus/selects read it back through `useDocumentDirection`.
 */
const syncDocumentLanguage = (lng: string): void => {
  const language = languages.find((entry) => entry.code === lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = language?.ltr === false ? "rtl" : "ltr";
};

const startI18n = (): void => {
  if (i18n.isInitialized || i18n.isInitializing) {
    return;
  }

  void i18n
    .use(
      new LanguageDetector(null, {
        lookupCookie: "lng",
        lookupLocalStorage: "lng",
      }),
    )
    .use(createTranslationBackend(customI18nResources, appTranslationLoaders))
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
    });

  // `index.html`'deki statik `lang="en"` niteliği gerçek aktif dille hiçbir
  // zaman senkron değildi — tarayıcı bunu fiilen render edilen içerikle
  // karşılaştırıp "çevrilsin mi?" widget'ı gösterebiliyordu. Aynı düzeltme
  // vendor panelde de var (packages/vendor/.../i18n.tsx) — bkz. oradaki
  // yorum. `document.documentElement.lang`'i i18next'in aktif diliyle her
  // zaman eşitle: ilk yüklemede ve her `changeLanguage()` çağrısında.
  i18n.on("languageChanged", syncDocumentLanguage);

  installKayiZodErrorMap();
};

const subscribeInitialized = (onChange: () => void): (() => void) => {
  i18n.on("initialized", onChange);
  return () => i18n.off("initialized", onChange);
};

const isInitialized = (): boolean => i18n.isInitialized;

/**
 * Starts i18next and renders its children only once the active language's
 * translations have loaded (they are fetched on demand, see i18n/backend.ts),
 * so no screen ever shows raw keys.
 */
export const I18n = ({ children }: PropsWithChildren) => {
  startI18n();
  const ready = useSyncExternalStore(subscribeInitialized, isInitialized);

  return ready ? <>{children}</> : null;
};

export { i18n };
