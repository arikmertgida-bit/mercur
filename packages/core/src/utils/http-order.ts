import type {
  HttpTypes,
  OrderChangeDTO,
  OrderDTO,
  OrderPreviewDTO,
} from "@medusajs/framework/types"

/**
 * The vendor order and return routes send the order graph Medusa's workflows
 * and query return, and their response contract is Medusa's HTTP order type.
 * Medusa models the two as parallel hierarchies — the module DTO (BigNumber
 * totals, optional relations) and the HTTP type (serialized numbers, nullable
 * relations) — that do not structurally unify, although the serialized object
 * is exactly the HTTP shape (Medusa's own admin routes pass the same value
 * straight to `res.json`). These two functions are that boundary.
 */
export const toHttpOrder = (order: OrderDTO): HttpTypes.AdminOrder => {
  // @ts-expect-error — Medusa boundary: module `OrderDTO` → HTTP `AdminOrder`
  // (same serialized object; see the comment above).
  return order
}

export const toHttpOrderPreview = (
  preview: OrderPreviewDTO
): HttpTypes.AdminOrderPreview => {
  // @ts-expect-error — Medusa boundary: module `OrderPreviewDTO` → HTTP
  // `AdminOrderPreview` (same serialized object; see the comment above).
  return preview
}

export const toHttpOrderChange = (
  change: OrderChangeDTO
): HttpTypes.AdminOrderChange => {
  // @ts-expect-error — Medusa boundary: module `OrderChangeDTO` → HTTP
  // `AdminOrderChange` (same serialized object; see the comment above).
  return change
}
