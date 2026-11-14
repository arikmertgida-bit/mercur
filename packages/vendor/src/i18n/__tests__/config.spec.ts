import i18next from "i18next"
import { describe, expect, test } from "vitest"

import { defaultI18nOptions } from "../config"
import { toIntlLocale } from "../languages"
import translations from "../translations"

const initWith = async (lng: string): Promise<string> => {
  const instance = i18next.createInstance()
  await instance.init({
    ...defaultI18nOptions,
    detection: undefined,
    resources: translations,
    lng,
  })
  return instance.language
}

describe("defaultI18nOptions", () => {
  test("an invalid stored language code falls back instead of reaching Intl", async () => {
    const language = await initWith("ptBR")

    expect(language).toBe("en")
    expect(() => new Intl.Collator(toIntlLocale(language))).not.toThrow()
  })

  test("a supported language code is kept", async () => {
    expect(await initWith("pt-BR")).toBe("pt-BR")
  })
})
