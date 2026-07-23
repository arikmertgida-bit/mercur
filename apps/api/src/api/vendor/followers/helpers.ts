import type { Query } from "@medusajs/framework"

import customerReview from "../../../links/customer-review"
import {
  CustomerReviewLinkRowSchema,
  OrderCustomerRowSchema,
  OrderSellerLinkRowSchema,
  ProductSellerLinkRowSchema,
  parseRows,
} from "../../../lib/graph-schemas"

/**
 * Both helpers below are scoped to the customer ids on the current page
 * (small, bounded) rather than the seller's full order/review volume — a
 * large seller with thousands of orders never forces a full-catalog scan
 * just to render a paginated followers list.
 */
export async function resolveOrderCountsByCustomer(
  query: Query,
  sellerId: string,
  customerIds: string[]
): Promise<Record<string, number>> {
  if (customerIds.length === 0) {
    return {}
  }

  const { data: orderRows } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id"],
    filters: { customer_id: customerIds },
  })

  const candidateOrders = parseRows(OrderCustomerRowSchema, orderRows)
  if (candidateOrders.length === 0) {
    return {}
  }

  const candidateOrderIds = candidateOrders.map((order) => order.id)

  const { data: sellerLinkRows } = await query.graph({
    entity: "order_seller",
    fields: ["order_id"],
    filters: { seller_id: sellerId, order_id: candidateOrderIds },
  })

  const matchedOrderIds = new Set(
    parseRows(OrderSellerLinkRowSchema, sellerLinkRows).map((link) => link.order_id)
  )

  const counts: Record<string, number> = {}
  for (const order of candidateOrders) {
    if (!order.customer_id || !matchedOrderIds.has(order.id)) {
      continue
    }
    counts[order.customer_id] = (counts[order.customer_id] ?? 0) + 1
  }

  return counts
}

export type CustomerReviewStats = {
  count: number
  average: number
}

export async function resolveReviewStatsByCustomer(
  query: Query,
  sellerId: string,
  customerIds: string[]
): Promise<Record<string, CustomerReviewStats>> {
  if (customerIds.length === 0) {
    return {}
  }

  const { data: linkRows } = await query.graph({
    entity: customerReview.entryPoint,
    fields: [
      "customer_id",
      "review.id",
      "review.rating",
      "review.reference",
      "review.product.id",
      "review.seller.id",
    ],
    filters: { customer_id: customerIds },
  })

  const rows = parseRows(CustomerReviewLinkRowSchema, linkRows).filter(
    (row) => row.review !== null && row.review !== undefined
  )
  if (rows.length === 0) {
    return {}
  }

  const productReviewRows = rows.filter((row) => row.review?.reference === "product" && row.review.product?.id)
  const candidateProductIds = Array.from(
    new Set(
      productReviewRows
        .map((row) => row.review?.product?.id)
        .filter((id): id is string => Boolean(id))
    )
  )

  let sellerProductIds = new Set<string>()
  if (candidateProductIds.length > 0) {
    const { data: productSellerRows } = await query.graph({
      entity: "product_seller",
      fields: ["product_id"],
      filters: { seller_id: sellerId, product_id: candidateProductIds },
    })
    sellerProductIds = new Set(
      parseRows(ProductSellerLinkRowSchema, productSellerRows).map((row) => row.product_id)
    )
  }

  const visibleRows = rows.filter((row) => {
    const review = row.review
    if (!review) {
      return false
    }
    if (review.reference === "seller") {
      return review.seller?.id === sellerId
    }
    return review.product?.id ? sellerProductIds.has(review.product.id) : false
  })

  const totals: Record<string, { total: number; count: number }> = {}
  for (const row of visibleRows) {
    const entry = totals[row.customer_id] ?? { total: 0, count: 0 }
    entry.total += row.review?.rating ?? 0
    entry.count += 1
    totals[row.customer_id] = entry
  }

  const stats: Record<string, CustomerReviewStats> = {}
  for (const [customerId, entry] of Object.entries(totals)) {
    stats[customerId] = { count: entry.count, average: entry.total / entry.count }
  }
  return stats
}
