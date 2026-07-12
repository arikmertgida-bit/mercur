import { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

export type AddItemInput = {
  variant_id: string
  quantity: number
  unit_price?: number | null
  internal_note?: string | null
  allow_backorder?: boolean
  metadata?: Record<string, unknown> | null
}

type ResolvedAddItem = AddItemInput & {
  unit_price?: number | null
  requires_shipping?: boolean
}

type VariantPricingRow = {
  id: string
  price_set?: { id?: string | null } | null
  product?: { shipping_profile?: { id?: string | null } | null } | null
}

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
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "price_set.id",
      "product.shipping_profile.id",
    ],
    filters: { id: variantIds },
  })

  const variantsById = new Map(
    (variants as VariantPricingRow[]).map((v) => [v.id, v])
  )

  const priceSetIds = Array.from(
    new Set(
      (variants as VariantPricingRow[])
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
