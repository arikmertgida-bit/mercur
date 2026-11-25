import i18next from "i18next"
import { describe, expect, test } from "vitest"

import { createTranslationBackend } from "../backend"
import { defaultI18nOptions } from "../config"
import { translationLanguages } from "../translations"
import tr from "../translations/tr.json"

const initWith = async (
  lng: string,
  custom: Parameters<typeof createTranslationBackend>[0] = {}
) => {
  const instance = i18next.createInstance()
  await instance.use(createTranslationBackend(custom)).init({
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
})
