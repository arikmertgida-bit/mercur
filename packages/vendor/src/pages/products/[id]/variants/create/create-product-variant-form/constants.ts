import i18next from "i18next"
import { z } from "zod"

type AmountInput = string | number | undefined

const isBlank = (value: AmountInput): boolean =>
  value === undefined || String(value).trim() === ""

const toAmount = (value: AmountInput): number | null => {
  if (isBlank(value)) return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

/**
 * `prices` is keyed by currency code and `inventory` by the seller's stock
 * location id; the form seeds every key with "" so the "at least one" errors
 * below can sit on the first input of each group.
 */
export const CreateProductVariantSchema = z
  .object({
    title: z.string().min(1, { error: () => i18next.t("products.variant.validation.titleRequired") }),
    sku: z.string().optional(),
    options: z
      .record(z.string(), z.string().min(1, { error: () => i18next.t("products.variant.validation.optionRequired") }))
      .optional(),
    // The currency input reports a number; a cleared input reports "".
    prices: z
      .record(z.string(), z.union([z.number(), z.string()]).optional())
      .default({}),
    inventory: z.record(z.string(), z.string().optional()).default({}),
  })
  .superRefine((value, ctx) => {
    const priceKeys = Object.keys(value.prices)
    const hasPrice = priceKeys.some((currency) => {
      const amount = toAmount(value.prices[currency])
      return amount !== null && amount >= 0
    })
    if (!hasPrice) {
      ctx.addIssue({
        code: "custom",
        path: priceKeys.length ? ["prices", priceKeys[0]] : ["prices"],
        message: i18next.t("products.create.errors.priceRequired"),
      })
    }

    const locationKeys = Object.keys(value.inventory)
    for (const locationId of locationKeys) {
      const raw = value.inventory[locationId]
      if (isBlank(raw)) continue
      const quantity = toAmount(raw)
      if (quantity === null || !Number.isInteger(quantity) || quantity < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["inventory", locationId],
          message: i18next.t("products.create.errors.stockRequired"),
        })
      }
    }
    const hasStock = locationKeys.some((locationId) => {
      const quantity = toAmount(value.inventory[locationId])
      return quantity !== null && quantity > 0
    })
    if (!hasStock) {
      ctx.addIssue({
        code: "custom",
        path: locationKeys.length ? ["inventory", locationKeys[0]] : ["inventory"],
        message: i18next.t("products.create.errors.stockRequired"),
      })
    }
  })

export type CreateProductVariantPayloadInput = {
  prices: Record<string, AmountInput>
  inventory: Record<string, string | undefined>
}

/** Only typed values are sent: a blank currency or location is skipped. */
export const toVariantStockPayload = ({
  prices,
  inventory,
}: CreateProductVariantPayloadInput): {
  prices: { currency_code: string; amount: number }[]
  inventory: { location_id: string; quantity: number }[]
} => ({
  prices: Object.entries(prices).flatMap(([currency_code, raw]) => {
    const amount = toAmount(raw)
    return amount === null ? [] : [{ currency_code, amount }]
  }),
  inventory: Object.entries(inventory).flatMap(([location_id, raw]) => {
    const quantity = toAmount(raw)
    return quantity === null || quantity <= 0 ? [] : [{ location_id, quantity }]
  }),
})
