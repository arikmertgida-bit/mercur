import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"

import productReview from "../../../links/product-review"
import sellerReview from "../../../links/seller-review"

/**
 * Bir değerlendirmenin bu satıcıya ait olduğunu doğrular. Review modelinin
 * kendisinde reference_id kolonu YOK — ilişki her zaman link modülleri
 * üzerinden kurulur: "seller" referanslı değerlendirmeler seller-review
 * linkinden, "product" referanslı değerlendirmeler product-review linkinden
 * (ürünün sellers ilişkisi üzerinden dolaylı) doğrulanır — aksi halde vendor
 * paneli hiçbir zaman ürün değerlendirmesine yanıt veremezdi.
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

  const belongsToSeller = products[0]?.sellers?.some(
    (seller) => seller.id === sellerId
  )

  if (!belongsToSeller) {
    throw notFoundError()
  }
}
