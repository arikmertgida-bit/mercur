import { HttpTypes, MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { z } from "zod"

import { parseGraphRows } from "../../../utils/graph-rows"

export type AddItemInput = {
  variant_id: string
  quantity: number
  unit_price?: number | null
  internal_note?: string | null
  allow_backorder?: boolean
  // Free-form, as Medusa's add-item payloads declare it.
  metadata?: HttpTypes.AdminAddOrderEditItems["items"][number]["metadata"] | null
}

type ResolvedAddItem = AddItemInput & {
  unit_price?: number | null
  requires_shipping?: boolean
}

export const OrderCurrencyRowSchema = z.object({ currency_code: z.string() })

const VariantPricingRowSchema = z.object({
  id: z.string(),
  price_set: z.object({ id: z.string().nullish() }).nullish(),
  product: z
    .object({
      shipping_profile: z.object({ id: z.string().nullish() }).nullish(),
    })
    .nullish(),
})

export const resolveAddItems = async ({
  container,
  currencyCode,
  items,
}: {
  container: MedusaContainer
  currencyCode: string
  items: AddItemInput[]
}): Promise<ResolvedAddItem[]> => {
  const variantIds = Array.from(
    new Set(items.map((i) => i.variant_id).filter((id): id is string => !!id))
  )

  if (!variantIds.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Each item must include a variant_id"
    )
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: variantRows } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "price_set.id",
      "product.shipping_profile.id",
    ],
    filters: { id: variantIds },
  })
  const variants = parseGraphRows(VariantPricingRowSchema, variantRows)

  const variantsById = new Map(
    variants.map((v) => [v.id, v])
  )

  const priceSetIds = Array.from(
    new Set(
      variants
        .map((v) => v.price_set?.id)
        .filter((id): id is string => !!id)
    )
  )

  const calculatedByPriceSet = new Map<string, number>()
  if (priceSetIds.length) {
    const pricingModule = container.resolve(Modules.PRICING)
    const calculated = await pricingModule.calculatePrices(
      { id: priceSetIds },
      { context: { currency_code: currencyCode } }
    )
    for (const calc of calculated) {
      if (calc.calculated_amount != null) {
        calculatedByPriceSet.set(calc.id, Number(calc.calculated_amount))
      }
    }
  }

  return items.map((item) => {
    if (!item.variant_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Each item must include a variant_id"
      )
    }

    const variant = variantsById.get(item.variant_id)
    if (!variant) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Variant ${item.variant_id} not found`
      )
    }

    const calculatedPrice = variant.price_set?.id
      ? calculatedByPriceSet.get(variant.price_set.id)
      : undefined

    if (item.unit_price == null && calculatedPrice == null) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Variant ${item.variant_id} has no price in ${currencyCode}`
      )
    }

    return {
      ...item,
      unit_price: item.unit_price ?? calculatedPrice ?? null,
      requires_shipping: !!variant.product?.shipping_profile?.id,
    }
  })
}
