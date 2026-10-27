import { z } from "zod"
import type { JsonRecord, JsonValue } from "@mercurjs/types"

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

/**
 * A query.graph row whose selected fields are all JSON-serializable — keys
 * the row does not carry read back as `undefined`.
 */
export const JsonSnapshotSchema = z.record(
  z.string(),
  JsonValueSchema.optional()
)

export type JsonSnapshot = z.infer<typeof JsonSnapshotSchema>

/**
 * Drops `undefined` entries, which a jsonb column never stores anyway, so a
 * record built from optional fields can be persisted as a `JsonRecord`.
 */
export const toJsonRecord = (entries: JsonSnapshot): JsonRecord => {
  const record: JsonRecord = {}
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined) {
      record[key] = value
    }
  }
  return record
}

export const isJsonObject = (
  value: JsonValue | undefined
): value is { [key: string]: JsonValue } =>
  typeof value === "object" && value !== null && !Array.isArray(value)
