import type { BigNumberInput } from "@medusajs/framework/types"
import { MathBN, MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

/**
 * Core has no generated query entry points, so `query.graph` rows arrive
 * untyped. Every row is validated against the shape the caller selected; a
 * mismatch is a server bug, so it fails loudly instead of dropping the row.
 */
export function parseGraphRows<T, TRow>(
  schema: z.ZodType<T>,
  rows: readonly TRow[] | null | undefined
): T[] {
  return (rows ?? []).map((row) => parseGraphRow(schema, row))
}

export function parseGraphRow<T, TRow>(schema: z.ZodType<T>, row: TRow): T {
  const parsed = schema.safeParse(row)

  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Unexpected query result shape: ${z.prettifyError(parsed.error)}`
    )
  }

  return parsed.data
}

/**
 * Timestamps are `Date` instances on a fresh query and ISO strings when the
 * result was served from the query cache.
 */
export const GraphDateSchema = z.union([z.string(), z.date()])

// The structural forms a money/quantity value takes in a query result. A
// BigNumber is matched by shape, not `instanceof`: several copies of
// `@medusajs/utils` can be installed side by side.
const BigNumberLikeSchema = z.union([
  z.number(),
  z.string().refine((value) => !MathBN.convert(value).isNaN()),
  z.object({ numeric: z.number() }),
  z.object({ value: z.union([z.string(), z.number()]) }),
])

/**
 * A money/quantity value as query returns it: a number, a numeric string, a
 * BigNumber or its raw `{ value, precision }` form, passed through unchanged.
 */
export const GraphBigNumberSchema = z.custom<BigNumberInput>(
  (value) => BigNumberLikeSchema.safeParse(value).success
)
