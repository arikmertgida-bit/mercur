import type { BigNumberValue } from "@medusajs/types"
import { z } from "zod"

// Medusa types an order credit line's `amount` as a BigNumberValue; the order
// routes serialize it as a plain number (or numeric string).
const CreditLineAmountSchema = z
  .union([z.number(), z.string()])
  .transform((value) => Number(value))

export const getCreditLineAmount = (creditLine: {
  amount: BigNumberValue
}): number => {
  const parsed = CreditLineAmountSchema.safeParse(creditLine.amount)

  return parsed.success && Number.isFinite(parsed.data) ? parsed.data : 0
}

export const getTotalCreditLines = (creditLines: { amount: BigNumberValue }[]) =>
  creditLines.reduce((acc, creditLine) => acc + getCreditLineAmount(creditLine), 0)
