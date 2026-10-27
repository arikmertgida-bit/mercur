// `orders.total`/`orders.item_total` are computed fields that only resolve
// correctly when requested alongside their sibling summary fields —
// `orders.original_total` included (empirically confirmed; without it the
// totals collapse to a partial computation).
export const storeOrderGroupFields = [
  "id",
  "display_id",
  "customer_id",
  "seller_count",
  "total",
  "created_at",
  "updated_at",
  "orders.id",
  "orders.display_id",
  "orders.status",
  "orders.fulfillment_status",
  "orders.payment_status",
  "orders.currency_code",
  "orders.total",
  "orders.original_total",
  "orders.subtotal",
  "orders.item_total",
  "orders.item_subtotal",
  "orders.shipping_total",
  "orders.shipping_subtotal",
  "orders.discount_subtotal",
  "orders.tax_total",
  "orders.seller_id",
  "orders.shipping_address",
  "orders.seller.id",
  "orders.seller.name",
  "orders.seller.handle",
  "orders.seller.logo",
  "orders.items.id",
  "orders.items.title",
  "orders.items.subtitle",
  "orders.items.thumbnail",
  "orders.items.product_title",
  "orders.items.variant_title",
  "orders.items.quantity",
  "orders.items.unit_price",
  "orders.items.total",
  "orders.items.variant_id",
  "orders.items.variant.product.handle",
  "orders.items.variant.product.title",
]

// Relations a caller may expand wholesale (`*orders`, `*orders.items`). Allowed
// but not defaulted, so the response keeps the curated shape above unless it is
// asked for the whole relation. `orders.seller` is deliberately absent: the
// curated seller fields above are the public ones, and a wildcard would also
// resolve the seller's payment and professional details.
const storeOrderGroupExpandableRelations = [
  "orders",
  "orders.items",
  "orders.items.variant",
  "orders.items.product",
  "orders.fulfillments",
  "orders.fulfillments.labels",
]

const storeOrderGroupAllowedFields = [
  ...storeOrderGroupFields,
  ...storeOrderGroupExpandableRelations,
]

export const storeOrderGroupQueryConfig = {
  list: {
    defaults: storeOrderGroupFields,
    allowed: storeOrderGroupAllowedFields,
    isList: true,
  },
  retrieve: {
    defaults: storeOrderGroupFields,
    allowed: storeOrderGroupAllowedFields,
    isList: false,
  },
}
