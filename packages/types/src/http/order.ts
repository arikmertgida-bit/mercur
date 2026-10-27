import { HttpTypes, PaginatedResponse } from "@medusajs/types"

/**
 * A fulfillment as the vendor order detail sends it: the order detail query
 * expands the fulfillment's `items`, `labels` and its shipping option's
 * fulfillment set `type`, which Medusa's embedded order-fulfillment HTTP
 * type leaves out.
 */
export type VendorOrderFulfillment = HttpTypes.AdminOrderFulfillment & {
  items?: HttpTypes.AdminFulfillmentItem[]
  labels?: HttpTypes.AdminFulfillmentLabel[]
  shipping_option?: {
    service_zone?: {
      fulfillment_set?: { type?: string | null } | null
    } | null
  } | null
}

// The vendor order routes serialize the same order graph the admin routes do,
// so the wire shape (string dates, `payment_status`, `fulfillment_status`,
// `payment_collections`) is Medusa's HTTP order — not the module `OrderDTO`.
// `canceled_at` is an order column the vendor query selects that Medusa's
// HTTP type does not declare.
export type VendorOrder = Omit<HttpTypes.AdminOrder, "fulfillments"> & {
  canceled_at?: string | null
  fulfillments?: VendorOrderFulfillment[]
}

export interface VendorOrderResponse {
  /**
   * The order's details.
   */
  order: VendorOrder
}

export type VendorOrderListResponse = PaginatedResponse<{
  /**
   * The list of orders.
   */
  orders: VendorOrder[]
}>

export interface VendorOrderPreviewResponse {
  /**
   * The order preview details.
   */
  order: HttpTypes.AdminOrderPreview
}

export interface VendorOrderChangesResponse {
  /**
   * The list of order changes.
   */
  order_changes: HttpTypes.AdminOrderChange[]
}

export interface VendorFulfillmentResponse {
  /**
   * The fulfillment details.
   */
  fulfillment: HttpTypes.AdminFulfillment
}
