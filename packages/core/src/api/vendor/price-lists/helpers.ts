import {
  MedusaContainer,
  PriceListDTO,
  PriceListRuleDTO,
} from "@medusajs/framework/types"
import {
  buildPriceListRules,
  buildPriceSetRules,
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"
import { z } from "zod"

import { parseGraphRow, parseGraphRows } from "../../../utils/graph-rows"
import {
  PriceListCorePrice,
  PriceListGraphPrice,
  TransformedPriceList,
  toHttpPriceList,
} from "../../../utils/http-price-list"

const PriceSetIdRowSchema = z.object({ price_set_id: z.string() })
const PriceIdRowSchema = z.object({ id: z.string() })
const VariantProductRefSchema = z.object({ product_id: z.string() })
const VariantPriceSetRowSchema = z.object({
  price_set: z.object({ id: z.string() }).nullish(),
})

export const validateSellerPriceList = async (
  scope: MedusaContainer,
  sellerId: string,
  priceListId: string
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [sellerPriceList],
  } = await query.graph({
    entity: "price_list_seller",
    filters: {
      seller_id: sellerId,
      price_list_id: priceListId,
    },
    fields: ["seller_id", "price_list_id"],
  })

  if (!sellerPriceList) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Price list with id: ${priceListId} was not found`
    )
  }
}

export const fetchPriceList = async (
  id: string,
  scope: MedusaContainer,
  fields: string[]
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "price_list",
    fields,
    filters: { id },
  })
  // Passed through with the requested fields.
  const priceList: PriceListDTO | undefined = data[0]

  if (!priceList) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Price list with id: ${id} was not found`
    )
  }

  return toHttpPriceList(transformPriceList(priceList))
}

type PriceListWithGraphRules = {
  price_list_rules?: PriceListRuleDTO[]
  prices?: PriceListGraphPrice[]
}

// Same shape as Medusa's `buildPriceSetPricesForCore`, which is typed as
// returning untyped records.
const toCorePrices = (prices: PriceListGraphPrice[]): PriceListCorePrice[] =>
  prices.map(({ price_rules, price_set, ...price }) => ({
    ...price,
    variant_id: price_set?.variant?.id ?? undefined,
    rules:
      typeof price_rules === "undefined"
        ? undefined
        : buildPriceSetRules(price_rules || []),
  }))

export const transformPriceList = <T extends PriceListWithGraphRules>(
  priceList: T,
): TransformedPriceList<T> => {
  const { price_list_rules, prices, ...rest } = priceList

  return {
    ...rest,
    ...(price_list_rules && { rules: buildPriceListRules(price_list_rules) }),
    ...(prices && { prices: toCorePrices(prices) }),
  }
}

/**
 * A price-list price has no `variant_id`/`offer_id` column of its own — it's
 * reached only through the variant's `price_set`, the same indirection
 * `fetchPriceListPriceIdsForProduct` resolves in the other direction. Used
 * by the vendor price-list detail page to list (and paginate) the products
 * that have at least one price in this list, with a per-product variant
 * count.
 */
export const fetchPriceListProductGroups = async (
  priceListId: string,
  scope: MedusaContainer
): Promise<HttpTypes.PriceListProductGroupDTO[]> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: prices } = await query.graph({
    entity: "price",
    filters: { price_list_id: priceListId },
    fields: ["price_set_id"],
  })

  const priceSetIds = Array.from(
    new Set(
      parseGraphRows(PriceSetIdRowSchema, prices).map((p) => p.price_set_id)
    )
  )

  if (!priceSetIds.length) {
    return []
  }

  const { data: variants } = await query.graph({
    entity: "product_variant",
    filters: { price_set: { id: priceSetIds } },
    fields: [
      "product_id",
      "product.title",
      "product.thumbnail",
      "product.status",
      "product.created_at",
      "product.updated_at",
      "product.categories.id",
      "product.categories.name",
      "product.collection.id",
      "product.collection.title",
    ],
  })

  const groups = new Map<string, HttpTypes.PriceListProductGroupDTO>()
  for (const variant of variants) {
    const { product_id } = parseGraphRow(VariantProductRefSchema, variant)
    // Passed through to the response as selected above.
    const product: HttpTypes.PriceListProductGroupDTO["product"] =
      variant.product
    const existing = groups.get(product_id)
    if (existing) {
      existing.variant_count += 1
    } else {
      groups.set(product_id, { product_id, variant_count: 1, product })
    }
  }

  return Array.from(groups.values())
}

export const fetchPriceListPriceIdsForProduct = async (
  priceListId: string,
  productIds: string[],
  scope: MedusaContainer
): Promise<string[]> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: variants } = await query.graph({
    entity: "product_variant",
    filters: { product_id: productIds },
    fields: ["price_set.id"],
  })

  const priceSetIds: string[] = []
  for (const variant of parseGraphRows(VariantPriceSetRowSchema, variants)) {
    if (variant.price_set?.id) {
      priceSetIds.push(variant.price_set.id)
    }
  }

  if (!priceSetIds.length) {
    return []
  }

  const { data: productPrices } = await query.graph({
    entity: "price",
    filters: {
      price_set_id: priceSetIds,
      price_list_id: priceListId,
    },
    fields: ["id"],
  })

  return parseGraphRows(PriceIdRowSchema, productPrices).map(
    (price) => price.id
  )
}
