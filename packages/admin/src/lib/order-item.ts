// Accepts both `OrderLineItemDTO` (module-level) and `AdminOrderLineItem`
// (HTTP-layer) shapes — only these two fields, common to both, are read.
type FulfillableLineItem = {
  quantity: number
  detail: { fulfilled_quantity: number }
}

export const getFulfillableQuantity = (item: FulfillableLineItem) => {
  return item.quantity - item.detail.fulfilled_quantity
}
