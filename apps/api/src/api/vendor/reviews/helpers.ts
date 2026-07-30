import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"

import productReview from "../../../links/product-review"
import sellerReview from "../../../links/seller-review"
import { ProductSellerIdsRowSchema, parseFirstRow } from "../../../lib/graph-schemas"

/**
 * Verifies that a review belongs to this seller. The review model itself
 * has NO reference_id column — the relationship is always established
 * through link modules: "seller"-referenced reviews are verified via the
 * seller-review link, "product"-referenced reviews via the product-review
 * link (indirectly, through the product's sellers relation) — otherwise the
 * vendor panel could never reply to a product review.
 */
export const validateSellerReview = async (
  scope: MedusaContainer,
  sellerId: string,
  reviewId: string
) => {
  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const notFoundError = () =>
    new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Review with id: ${reviewId} was not found`
    )

  const {
    data: [sellerReviewLink],
  } = await query.graph({
    entity: sellerReview.entryPoint,
    filters: { seller_id: sellerId, review_id: reviewId },
    fields: ["seller_id", "review_id"],
  })

  if (sellerReviewLink) {
    return
  }

  const { data: productReviewLinks } = await query.graph({
    entity: productReview.entryPoint,
    filters: { review_id: reviewId },
    fields: ["product_id", "review_id"],
  })

  const productId = productReviewLinks[0]?.product_id

  if (!productId) {
    throw notFoundError()
  }

  const { data: products } = await query.graph({
    entity: "product",
    filters: { id: productId },
    fields: ["id", "sellers.id"],
  })

  const product = parseFirstRow(ProductSellerIdsRowSchema, products)
  const belongsToSeller = product?.sellers?.some(
    (seller) => seller.id === sellerId
  )

  if (!belongsToSeller) {
    throw notFoundError()
  }
}
