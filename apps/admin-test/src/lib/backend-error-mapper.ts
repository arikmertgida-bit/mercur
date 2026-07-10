import { z } from "zod"
import type { JsonRecord } from "./json-record"

const BackendErrorBodySchema = z
  .object({
    message: z.string().optional(),
    error: z.string().optional(),
  })
  .passthrough()

/**
 * Extracts a human-readable error message from an unknown API response body.
 */
export function mapUnknownBackendError(body: JsonRecord, fallback: string): string {
  const result = BackendErrorBodySchema.safeParse(body)
  if (!result.success) return fallback
  const { message, error } = result.data
  if (message) return message
  if (error) return error
  return fallback
}
