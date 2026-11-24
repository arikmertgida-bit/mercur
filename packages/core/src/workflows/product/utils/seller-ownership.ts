import { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "zod"

import {
  PRODUCT_SELLER_REQUIRED_CODE,
  PRODUCT_SHIPPING_PROFILE_NOT_SELLER_CODE,
  PRODUCT_STOCK_LOCATION_NOT_SELLER_CODE,
} from "../../../api/utils/admin-error-codes"
import { parseGraphRows } from "../../../utils/graph-rows"

const SellerIdRowSchema = z.object({ id: z.string() })
const ShippingProfileLinkRowSchema = z.object({
  shipping_profile_id: z.string(),
})
const StockLocationLinkRowSchema = z.object({ stock_location_id: z.string() })
const ProductSellerRowSchema = z.object({
  sellers: z.array(z.object({ id: z.string() }).nullable()).nullish(),
})

/**
 * Exactly one seller per product: the store that sells it, ships it with its
 * own shipping profile and stocks it in its own locations.
 */
export const requireSingleSellerId = (
  sellerIds: string[] | null | undefined
): string => {
  const unique = Array.from(new Set(sellerIds ?? []))
  const [sellerId] = unique
  if (unique.length !== 1 || !sellerId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A product must belong to exactly one store",
      PRODUCT_SELLER_REQUIRED_CODE
    )
  }
  return sellerId
}

export const assertSellerExists = async (
  scope: MedusaContainer,
  sellerId: string
): Promise<void> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "seller",
    fields: ["id"],
    filters: { id: sellerId },
  })
  if (!parseGraphRows(SellerIdRowSchema, data).length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Seller with id: ${sellerId} was not found`
    )
  }
}

export const assertShippingProfileOfSeller = async (
  scope: MedusaContainer,
  sellerId: string,
  shippingProfileId: string | null | undefined
): Promise<void> => {
  if (!shippingProfileId) {
    return
  }
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "shipping_profile_seller",
    fields: ["shipping_profile_id"],
    filters: { seller_id: sellerId, shipping_profile_id: shippingProfileId },
  })
  if (!parseGraphRows(ShippingProfileLinkRowSchema, data).length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The shipping profile does not belong to the product's store",
      PRODUCT_SHIPPING_PROFILE_NOT_SELLER_CODE
    )
  }
}

export const assertStockLocationsOfSeller = async (
  scope: MedusaContainer,
  sellerId: string,
  stockLocationIds: string[]
): Promise<void> => {
  const ids = Array.from(new Set(stockLocationIds))
  if (!ids.length) {
    return
  }
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "stock_location_seller",
    fields: ["stock_location_id"],
    filters: { seller_id: sellerId, stock_location_id: ids },
  })
  const owned = new Set(
    parseGraphRows(StockLocationLinkRowSchema, data).map(
      (row) => row.stock_location_id
    )
  )
  const foreign = ids.find((id) => !owned.has(id))
  if (foreign) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The stock location does not belong to the product's store",
      PRODUCT_STOCK_LOCATION_NOT_SELLER_CODE
    )
  }
}

/**
 * The seller a product belongs to. A product without exactly one seller
 * predates the one-seller rule and must be moved to a seller first.
 */
export const getProductSellerId = async (
  scope: MedusaContainer,
  productId: string
): Promise<string> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["sellers.id"],
    filters: { id: productId },
  })
  const [product] = parseGraphRows(ProductSellerRowSchema, data)
  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id: ${productId} was not found`
    )
  }
  return requireSingleSellerId(
    (product.sellers ?? []).flatMap((seller) => (seller ? [seller.id] : []))
  )
}
