import { HttpTypes, MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { z } from "zod"

import { parseGraphRows } from "../../../utils/graph-rows"
import { ORDER_VARIANT_NOT_SELLER_CODE } from "../../utils/admin-error-codes"

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

/**
 * Who is adding the items. A seller never learns that another store's variant
 * exists (404, like any foreign resource); the admin gets its own error code.
 */
export const AddItemsCaller = {
  VENDOR: "vendor",
  ADMIN: "admin",
} as const

export type AddItemsCaller = (typeof AddItemsCaller)[keyof typeof AddItemsCaller]

export const OrderCurrencyRowSchema = z.object({ currency_code: z.string() })

const VariantPricingRowSchema = z.object({
  id: z.string(),
  price_set: z.object({ id: z.string().nullish() }).nullish(),
  product: z
    .object({
      shipping_profile: z.object({ id: z.string().nullish() }).nullish(),
      sellers: z.array(z.object({ id: z.string() }).nullable()).nullish(),
    })
    .nullish(),
})

type VariantPricingRow = z.infer<typeof VariantPricingRowSchema>

const OrderSellerRowSchema = z.object({ seller_id: z.string() })

const getOrderSellerId = async (
  container: MedusaContainer,
  orderId: string
): Promise<string | null> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order_seller",
    fields: ["seller_id"],
    filters: { order_id: orderId },
  })
  return parseGraphRows(OrderSellerRowSchema, data)[0]?.seller_id ?? null
}

const getVariantSellerId = (variant: VariantPricingRow): string | null =>
  (variant.product?.sellers ?? []).flatMap((seller) =>
    seller ? [seller.id] : []
  )[0] ?? null

const foreignVariantError = (
  caller: AddItemsCaller,
  variantId: string
): MedusaError =>
  caller === AddItemsCaller.ADMIN
    ? new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Variant ${variantId} does not belong to the order's store`,
        ORDER_VARIANT_NOT_SELLER_CODE
      )
    : new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Variant ${variantId} not found`
      )

/**
 * An order belongs to exactly one store, so every added variant must come from
 * that store: otherwise the order draws another store's stock while the money
 * goes to the order's seller, and the order stops being single-store.
 */
export const resolveAddItems = async ({
  container,
  caller,
  orderId,
  currencyCode,
  items,
}: {
  container: MedusaContainer
  caller: AddItemsCaller
  orderId: string
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
      "product.sellers.id",
    ],
    filters: { id: variantIds },
  })
  const variants = parseGraphRows(VariantPricingRowSchema, variantRows)

  const orderSellerId = await getOrderSellerId(container, orderId)
  const foreign = variants.find(
    (variant) => getVariantSellerId(variant) !== orderSellerId
  )
  if (foreign) {
    throw foreignVariantError(caller, foreign.id)
  }

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
