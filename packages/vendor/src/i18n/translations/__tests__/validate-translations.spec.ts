import fs from "fs"
import path from "path"
import { describe, expect, test } from "vitest"

import schema from "../$schema.json"

const translationsDir = path.join(__dirname, "..")

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/

function getRequiredKeysFromSchema(schema: any, prefix = ""): string[] {
  const keys: string[] = []

  if (schema.type === "object" && schema.properties) {
    Object.entries(schema.properties).forEach(([key, value]: [string, any]) => {
      const newPrefix = prefix ? `${prefix}.${key}` : key
      if (value.type === "object") {
        keys.push(...getRequiredKeysFromSchema(value, newPrefix))
      } else {
        keys.push(newPrefix)
      }
    })
  }

  return keys.sort()
}

function getTranslationKeys(obj: any, prefix = ""): string[] {
  const keys: string[] = []

  Object.entries(obj).forEach(([key, value]) => {
    const newPrefix = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === "object") {
      keys.push(...getTranslationKeys(value, newPrefix))
    } else {
      keys.push(newPrefix)
    }
  })

  return keys
}

describe("translation schema validation", () => {
  test("en.json should have all keys defined in schema", () => {
    const enPath = path.join(translationsDir, "en.json")
    const enTranslations = JSON.parse(fs.readFileSync(enPath, "utf-8"))

    const schemaKeys = getRequiredKeysFromSchema(schema)
    const translationKeys = getTranslationKeys(enTranslations)

    const missingInTranslations = schemaKeys.filter(
      (key) => !translationKeys.includes(key)
    )
    const extraInTranslations = translationKeys.filter(
      (key) => !schemaKeys.includes(key)
    )

    if (missingInTranslations.length > 0) {
      console.error("\nMissing keys in en.json:", missingInTranslations)
    }

    if (extraInTranslations.length > 0) {
      console.error("\nExtra keys in en.json:", extraInTranslations)
    }

    expect(missingInTranslations).toEqual([])
    expect(extraInTranslations).toEqual([])
  })

  const enPath = path.join(translationsDir, "en.json")
  const enTranslations = JSON.parse(fs.readFileSync(enPath, "utf-8"))
  const enKeys = new Set(getTranslationKeys(enTranslations))
  const enFamilies = new Set(
    [...enKeys].map((key) => key.replace(PLURAL_SUFFIX, ""))
  )

  const localeFiles = fs
    .readdirSync(translationsDir)
    .filter(
      (file) =>
        file.endsWith(".json") && file !== "en.json" && file !== "$schema.json"
    )

  test.each(localeFiles)(
    "%s should have exactly en.json's keys (no missing, no stale keys)",
    (file) => {
      const localePath = path.join(translationsDir, file)
      const localeTranslations = JSON.parse(fs.readFileSync(localePath, "utf-8"))
      const localeKeys = new Set(getTranslationKeys(localeTranslations))

      const missing = [...enKeys].filter((key) => !localeKeys.has(key)).sort()

      // Locales with richer CLDR plural categories (e.g. Polish _few/_many,
      // Arabic _zero/_two) legitimately carry plural-suffixed keys that
      // en.json doesn't need — only flag a key as stale if its un-suffixed
      // family doesn't exist in en.json at all (i.e. a genuinely removed key).
      const stale = [...localeKeys]
        .filter(
          (key) =>
            !enKeys.has(key) && !enFamilies.has(key.replace(PLURAL_SUFFIX, ""))
        )
        .sort()

      if (missing.length > 0) {
        console.error(`\nMissing keys in ${file}:`, missing)
      }

      if (stale.length > 0) {
        console.error(`\nStale keys in ${file} (not in en.json):`, stale)
      }

      expect(missing).toEqual([])
      expect(stale).toEqual([])
    }
  )
})
