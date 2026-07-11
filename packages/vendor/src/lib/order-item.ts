// Accepts both the core `OrderLineItemDTO` and the HTTP-layer
// `AdminOrderLineItem` — they diverge in most fields but agree on this
// shape, so callers on either side can pass their item straight through.
type FulfillableLineItem = {
  quantity: number
  detail: { fulfilled_quantity: number }
}

export const getFulfillableQuantity = (item: FulfillableLineItem) => {
  return item.quantity - item.detail.fulfilled_quantity
}
