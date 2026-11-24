import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { z } from "zod"

import { parseGraphRows } from "../../../utils/graph-rows"

const ProductSellerLinkRowSchema = z.object({
  product_id: z.string().nullable(),
})

/**
 * Products visible to this seller: exactly those linked to it through
 * `product_seller`. Every product has one store (the vendor create route and
 * CSV import link it on creation); who created it does not matter, so a
 * product an admin moved to another store disappears from the old one.
 */
export const getSellerVisibleProductIds = async (
  scope: MedusaContainer,
  sellerId: string
): Promise<string[]> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: links } = await query.graph({
    entity: "product_seller",
    fields: ["product_id"],
    filters: { seller_id: sellerId },
  })

  const productIds = new Set<string>()
  for (const link of parseGraphRows(ProductSellerLinkRowSchema, links)) {
    if (link.product_id) {
      productIds.add(link.product_id)
    }
  }

  return Array.from(productIds)
}

export const getProductStatus = async (
  scope: MedusaContainer,
  productId: string
): Promise<{ id: string; status: string } | undefined> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [product],
  } = await query.graph({
    entity: "product",
    fields: ["id", "status"],
    filters: { id: productId },
  })

  return product
}

export const ensureSellerOwnsProduct = async (
  scope: MedusaContainer,
  sellerId: string,
  productIds: string[]
): Promise<void> => {
  if (!productIds.length) {
    return
  }

  const visibleProductIds = new Set(
    await getSellerVisibleProductIds(scope, sellerId)
  )
  const missingProductId = productIds.find((id) => !visibleProductIds.has(id))

  if (missingProductId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id ${missingProductId} was not found`
    )
  }
}
