import i18next from "i18next"
import { describe, expect, test } from "vitest"

import { createTranslationBackend } from "../backend"
import { defaultI18nOptions } from "../config"
import { dateLocaleLanguages, getDateLocale } from "../date-locales"
import { languages } from "../languages"
import { translationLanguages } from "../translations"
import tr from "../translations/tr.json"
import type { TranslationLoaders, TranslationResources } from "../types"

const initWith = async (
  lng: string,
  custom: TranslationResources = {},
  appLoaders: TranslationLoaders = {}
) => {
  const instance = i18next.createInstance()
  await instance.use(createTranslationBackend(custom, appLoaders)).init({
    ...defaultI18nOptions,
    detection: undefined,
    fallbackLng: "en",
    lng,
  })
  return instance
}

describe("on-demand translation backend", () => {
  test("loads only the active language and the fallback", async () => {
    const instance = await initWith("tr")

    expect(instance.t("actions.save")).toBe(tr.actions.save)
    const loaded = translationLanguages.filter((language) =>
      instance.hasResourceBundle(language, "translation")
    )
    expect(loaded.sort()).toEqual(["en", "tr"])
  })

  test("a language switch loads that language before it becomes active", async () => {
    const instance = await initWith("tr")

    await instance.changeLanguage("ar")

    expect(instance.language).toBe("ar")
    expect(instance.hasResourceBundle("ar", "translation")).toBe(true)
    expect(instance.t("actions.save")).not.toBe("actions.save")
  })

  test("app translations are merged over the built-in file", async () => {
    const instance = await initWith("tr", {
      tr: { translation: { actions: { save: "Kaydet!" }, kayiOnly: "x" } },
    })

    expect(instance.t("actions.save")).toBe("Kaydet!")
    expect(instance.t("actions.cancel")).toBe(tr.actions.cancel)
    expect(instance.t("kayiOnly")).toBe("x")
  })

  test("app loaders: only the active and fallback languages' app files are imported", async () => {
    const requested: string[] = []
    const appLoaders: TranslationLoaders = Object.fromEntries(
      translationLanguages.map((language) => [
        language,
        () => {
          requested.push(language)
          return Promise.resolve({
            default: { actions: { save: `app-${language}` }, appOnly: language },
          })
        },
      ])
    )

    const instance = await initWith("tr", {}, appLoaders)

    expect(requested.sort()).toEqual(["en", "tr"])
    expect(instance.t("actions.save")).toBe("app-tr")
    expect(instance.t("actions.cancel")).toBe(tr.actions.cancel)
    expect(instance.t("appOnly")).toBe("tr")
  })

  test("app file wins over plugin resources, which win over the built-in file", async () => {
    const instance = await initWith(
      "tr",
      { tr: { translation: { actions: { save: "plugin", cancel: "plugin" } } } },
      { tr: () => Promise.resolve({ default: { actions: { save: "app" } } }) }
    )

    expect(instance.t("actions.save")).toBe("app")
    expect(instance.t("actions.cancel")).toBe("plugin")
  })

  test("plugin namespaces other than translation are served", async () => {
    const instance = await initWith("tr", {
      tr: { translation: {}, reviews: { title: "Yorumlar" } },
    })

    await instance.loadNamespaces("reviews")

    expect(instance.t("title", { ns: "reviews" })).toBe("Yorumlar")
  })

  test("a language's date-fns locale is loaded with its translations", async () => {
    expect(getDateLocale("ja").code).toBe("en-US")

    const instance = await initWith("tr")
    expect(getDateLocale("tr").code).toBe("tr")

    await instance.changeLanguage("ja")
    expect(getDateLocale("ja").code).toBe("ja")
  })

  test("every panel language has a date-fns locale", () => {
    expect([...dateLocaleLanguages].sort()).toEqual(
      languages.map((language) => language.code).sort()
    )
  })
})
