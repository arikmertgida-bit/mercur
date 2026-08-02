import { MedusaContainer, PriceDTO, PriceListRuleDTO } from "@medusajs/framework/types"
import {
  buildPriceListRules,
  buildPriceSetPricesForCore,
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { PriceListProductGroupDTO } from "@mercurjs/types"

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

  const {
    data: [priceList],
  } = await query.graph({
    entity: "price_list",
    fields,
    filters: { id },
  })

  if (!priceList) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Price list with id: ${id} was not found`
    )
  }

  return transformPriceList(priceList)
}

type PriceListWithGraphRules = {
  price_list_rules?: PriceListRuleDTO[]
  prices?: PriceDTO[]
  rules?: ReturnType<typeof buildPriceListRules>
}

type ProductVariantWithPriceSet = {
  price_set?: { id: string }
}

export const transformPriceList = <T extends PriceListWithGraphRules>(
  priceList: T,
): T => {
  if (priceList.price_list_rules) {
    priceList.rules = buildPriceListRules(priceList.price_list_rules)
    Reflect.deleteProperty(priceList as object, "price_list_rules")
  }

  if (priceList.prices) {
    priceList.prices = buildPriceSetPricesForCore(
      priceList.prices,
    ) as PriceDTO[]
  }

  return priceList
}

type VariantWithProduct = {
  product_id: string
  product: PriceListProductGroupDTO["product"]
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
): Promise<PriceListProductGroupDTO[]> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: prices } = await query.graph({
    entity: "price",
    filters: { price_list_id: priceListId },
    fields: ["price_set_id"],
  })

  const priceSetIds = Array.from(
    new Set(
      (prices as Array<{ price_set_id: string }>).map((p) => p.price_set_id)
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

  const groups = new Map<string, PriceListProductGroupDTO>()
  for (const variant of variants as VariantWithProduct[]) {
    const existing = groups.get(variant.product_id)
    if (existing) {
      existing.variant_count += 1
    } else {
      groups.set(variant.product_id, {
        product_id: variant.product_id,
        variant_count: 1,
        product: variant.product,
      })
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
  for (const variant of variants as ProductVariantWithPriceSet[]) {
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

  return (productPrices as Array<{ id: string }>).map((price) => price.id)
}
