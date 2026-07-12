import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ProductChangeActionType } from "@mercurjs/types"

export const getSellerOwnedProductIds = async (
  scope: MedusaContainer,
  sellerId: string
): Promise<string[]> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: actions } = await query.graph({
    entity: "product_change_action",
    fields: ["product_id"],
    filters: {
      action: ProductChangeActionType.PRODUCT_ADD,
      product_change: { created_by: sellerId },
    },
  })

  return actions
    .map(action => action.product_id)
}

/**
 * Absolute allow-list of products visible to this seller: either explicitly
 * linked via `product_seller`, or attributed to them via the product-creation
 * audit trail. No other product — published or not — is ever included; there
 * is no "unclaimed products are public" fallback.
 */
export const getSellerVisibleProductIds = async (
  scope: MedusaContainer,
  sellerId: string
): Promise<string[]> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const [{ data: links }, ownedFromAudit] = await Promise.all([
    query.graph({
      entity: "product_seller",
      fields: ["product_id"],
      filters: { seller_id: sellerId },
    }),
    getSellerOwnedProductIds(scope, sellerId),
  ])

  const productIds = new Set<string>(ownedFromAudit)
  for (const link of links as { product_id: string | null }[]) {
    if (link.product_id) {
      productIds.add(link.product_id)
    }
  }

  return Array.from(productIds)
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
