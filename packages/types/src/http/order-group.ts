import { DeleteResponse, HttpTypes, PaginatedResponse } from "@medusajs/types"
import { OrderGroupDTO } from "../order-group"

export interface VendorOrderGroupResponse {
  /**
   * The order group's details.
   */
  order_group: OrderGroupDTO
}

export type VendorOrderGroupListResponse = PaginatedResponse<{
  /**
   * The list of order groups.
   */
  order_groups: OrderGroupDTO[]
}>

export type VendorOrderGroupDeleteResponse = DeleteResponse<"order_group">

/**
 * An order of an admin order group, as the order group routes serialize the
 * `orders` link (with Mercur's `seller` link when it is selected).
 */
export type AdminOrderGroupOrder = HttpTypes.AdminOrder & {
  seller?: { id?: string; name?: string | null } | null
}

// The admin order group routes return the group's `orders` when the request's
// fields select them.
export type AdminOrderGroup = OrderGroupDTO & {
  orders?: AdminOrderGroupOrder[]
}

export interface AdminOrderGroupResponse {
  /**
   * The order group's details.
   */
  order_group: AdminOrderGroup
}

export type AdminOrderGroupListResponse = PaginatedResponse<{
  /**
   * The list of order groups.
   */
  order_groups: AdminOrderGroup[]
}>

export type AdminOrderGroupDeleteResponse = DeleteResponse<"order_group">

export interface StoreOrderGroupResponse {
  /**
   * The order group's details.
   */
  order_group: OrderGroupDTO
}

export type StoreOrderGroupListResponse = PaginatedResponse<{
  /**
   * The list of order groups.
   */
  order_groups: OrderGroupDTO[]
}>

export type StoreCompleteCartResponse =
  | {
      type: "order_group"
      order_group: OrderGroupDTO
    }
  | {
      type: "cart"
      cart: HttpTypes.StoreCart
      error: {
        message: string
        name: string
        type: string
      }
    }
