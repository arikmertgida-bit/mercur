import type { JsonRecord, JsonValue } from "@mercurjs/types"
import { z } from "zod"

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ])
)

export const JsonRecordSchema: z.ZodType<JsonRecord> = z.record(
  z.string(),
  JsonValueSchema
)

export const isJsonObject = (
  value: JsonValue | undefined
): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * Normalizes a form value for a text-like `<input>`/`<textarea>` value prop,
 * mirroring how React stringifies other values.
 */
export const toInputValue = (value: JsonValue | undefined): string | number => {
  if (typeof value === "string" || typeof value === "number") {
    return value
  }

  return value == null ? "" : String(value)
}

/**
 * Parses JSON text into a validated `JsonValue`; `undefined` when the text
 * is not valid JSON.
 */
export const safeParseJson = (text: string): JsonValue | undefined => {
  try {
    const parsed = JsonValueSchema.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}
