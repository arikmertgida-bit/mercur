import fs from "fs"
import path from "path"
import { describe, expect, test } from "vitest"

const translationsDir = path.join(__dirname, "..")

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/

function getTranslationKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = []

  Object.entries(obj).forEach(([key, value]) => {
    const newPrefix = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === "object") {
      keys.push(...getTranslationKeys(value as Record<string, unknown>, newPrefix))
    } else {
      keys.push(newPrefix)
    }
  })

  return keys
}

const enPath = path.join(translationsDir, "en.json")
const enTranslations = JSON.parse(fs.readFileSync(enPath, "utf-8"))
const enKeys = new Set(getTranslationKeys(enTranslations))
const enFamilies = new Set([...enKeys].map((key) => key.replace(PLURAL_SUFFIX, "")))

const localeFiles = fs
  .readdirSync(translationsDir)
  .filter(
    (file) =>
      file.endsWith(".json") && file !== "en.json" && file !== "index.ts"
  )

describe("apps/vendor i18n key parity", () => {
  test.each(localeFiles)(
    "%s should have exactly en.json's keys (no missing, no stale keys)",
    (file) => {
      const localePath = path.join(translationsDir, file)
      const localeTranslations = JSON.parse(fs.readFileSync(localePath, "utf-8"))
      const localeKeys = new Set(getTranslationKeys(localeTranslations))

      const missing = [...enKeys].filter((key) => !localeKeys.has(key)).sort()

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
