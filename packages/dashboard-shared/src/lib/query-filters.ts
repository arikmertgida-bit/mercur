import { z } from "zod"

/**
 * Parses a JSON-encoded URL query param (e.g. a table filter such as
 * `created_at={"$gte":"..."}`) and validates it against `schema`.
 *
 * Query params are user-editable, so malformed JSON or a value of the wrong
 * shape yields `undefined` — the filter is ignored instead of crashing the
 * page.
 */
export const parseJsonQueryParam = <T>(
  value: string | null | undefined,
  schema: z.ZodType<T>
): T | undefined => {
  if (!value) {
    return undefined
  }

  try {
    const parsed = schema.safeParse(JSON.parse(value))
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

/**
 * A date filter's comparison operators, with ISO date strings as values
 * (same shape as `DataTableDateComparisonOperator` from `@medusajs/ui`).
 */
export const DateComparisonFilterSchema = z.object({
  $gte: z.string().optional(),
  $lte: z.string().optional(),
  $gt: z.string().optional(),
  $lt: z.string().optional(),
})

export type DateComparisonFilter = z.infer<typeof DateComparisonFilterSchema>

/**
 * A number filter's comparison operators (same shape as
 * `DataTableNumberComparisonOperator` from `@medusajs/ui`).
 */
export const NumberComparisonFilterSchema = z.object({
  $eq: z.number().optional(),
  $gt: z.number().optional(),
  $gte: z.number().optional(),
  $lt: z.number().optional(),
  $lte: z.number().optional(),
})

export type NumberComparisonFilter = z.infer<
  typeof NumberComparisonFilterSchema
>

/**
 * A number filter value: an exact number or a set of comparison operators.
 */
export const NumberFilterValueSchema = z.union([
  z.number(),
  NumberComparisonFilterSchema,
])

export type NumberFilterValue = z.infer<typeof NumberFilterValueSchema>

/**
 * The URL format written by the legacy table `NumberFilter` chip: an exact
 * number, or a range keyed by `gt` / `lt` holding the raw input text.
 */
export const RangeNumberFilterValueSchema = z.union([
  z.number(),
  z.object({
    gt: z.union([z.string(), z.number()]).optional(),
    lt: z.union([z.string(), z.number()]).optional(),
  }),
])

export type RangeNumberFilterValue = z.infer<typeof RangeNumberFilterValueSchema>
