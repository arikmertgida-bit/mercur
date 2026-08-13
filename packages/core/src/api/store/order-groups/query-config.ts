// `total`/`item_total` are computed fields that only resolve correctly when
// requested alongside their sibling summary fields (original_total included)
// AND without the `items` relation also being loaded in the same query —
// pulling in `items` makes Medusa's remote-query resolver fall back to a
// partial/wrong computation (observed collapsing total to just
// shipping_total, item_total to 0). Callers that need line-item detail
// (list page) always pass their own explicit `fields` and so never hit the
// defaults below; this narrower set is what unqualified retrieves get.
const storeOrderGroupDefaultFields = [
  "id",
  "customer_id",
  "seller_count",
  "total",
  "created_at",
  "updated_at",
  "orders",
  "orders.display_id",
  "orders.seller_id",
  "orders.total",
  "orders.original_total",
  "orders.item_total",
  "orders.shipping_total",
  "orders.tax_total",
  "orders.currency_code",
  "orders.seller.id",
  "orders.seller.name",
]

// The full allow-list — a superset of the defaults above, adding the
// line-item chain so explicit `fields` requests (e.g. the storefront's own
// order list fetcher) can still ask for it.
export const storeOrderGroupFields = [
  ...storeOrderGroupDefaultFields,
  "orders.items",
  "orders.items.variant",
  "orders.items.variant.product",
  "orders.items.variant.product.seller",
  "orders.items.variant.product.seller.id",
  "orders.items.variant.product.seller.name",
  // `status` is a raw column but `fulfillment_status`/`payment_status` are
  // computed properties — both must be explicitly allow-listed or Medusa's
  // remote-query silently drops them even when a caller names them by hand.
  "orders.status",
  "orders.fulfillment_status",
  "orders.payment_status",
  "orders.seller.logo",
  "orders.seller.handle",
  "orders.fulfillments",
  "orders.fulfillments.shipped_at",
  "orders.fulfillments.delivered_at",
  "orders.fulfillments.canceled_at",
  "orders.fulfillments.labels",
  "orders.fulfillments.labels.tracking_number",
  "orders.fulfillments.labels.tracking_url",
]

export const storeOrderGroupQueryConfig = {
  list: {
    defaults: storeOrderGroupDefaultFields,
    allowed: storeOrderGroupFields,
    isList: true,
  },
  retrieve: {
    defaults: storeOrderGroupDefaultFields,
    allowed: storeOrderGroupFields,
    isList: false,
  },
}
