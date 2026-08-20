import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"
import { z } from "zod"

import productReview from "../../../links/product-review"
import sellerReview from "../../../links/seller-review"
import { ProductSellerIdsRowSchema, parseFirstRow } from "../../../lib/graph-schemas"
import { ReviewCustomerSummaryDTO } from "../../../modules/reviews/types"

const VendorReviewCustomerRowSchema = z
  .object({
    id: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
  })
  .nullable()
  .optional()

type RawVendorReviewCustomer =
  | { id: string; first_name?: string | null; last_name?: string | null }
  | null
  | undefined

/**
 * Reshapes the raw `customer.*` graph fields into `ReviewCustomerSummaryDTO`
 * via Zod so an unexpected/missing join never leaks an unvalidated shape
 * into the vendor response (mirrors the store review-replies helpers).
 */
export function mapReviewCustomer(raw: RawVendorReviewCustomer): ReviewCustomerSummaryDTO | null {
  const parsed = VendorReviewCustomerRowSchema.safeParse(raw)
  if (!parsed.success || !parsed.data) {
    return null
  }
  return {
    id: parsed.data.id,
    first_name: parsed.data.first_name ?? null,
    last_name: parsed.data.last_name ?? null,
  }
}

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
