import { DeleteResponse, HttpTypes, PaginatedResponse } from "@medusajs/types"

/**
 * A return item; the vendor return queries can expand its `reason`, which
 * Medusa's return item type omits.
 */
export type VendorReturnItem = HttpTypes.AdminReturnItem & {
  reason?: HttpTypes.AdminReturnReason | null
}

/**
 * The return as the vendor routes send it — the same wire shape Medusa's
 * admin return routes produce. The vendor return list also selects the
 * order's `display_id` and `email`, which Medusa's return type omits.
 */
export type VendorReturn = Omit<HttpTypes.AdminReturn, "items"> & {
  items: VendorReturnItem[]
  order?: Partial<Pick<HttpTypes.AdminOrder, "id" | "display_id" | "email">> | null
}

export interface VendorReturnResponse {
  /**
   * The return's details.
   */
  return: VendorReturn
}

export type VendorReturnListResponse = PaginatedResponse<{
  /**
   * The list of returns.
   */
  returns: VendorReturn[]
}>

export interface VendorOrderReturnResponse {
  /**
   * The order's details.
   */
  order: HttpTypes.AdminOrder
  /**
   * The return's details.
   */
  return: VendorReturn
}

export interface VendorReturnPreviewResponse {
  /**
   * The order preview.
   */
  order_preview: HttpTypes.AdminOrderPreview
  /**
   * The return's details.
   */
  return: VendorReturn
}

export type VendorReturnDeleteResponse = DeleteResponse<"return">

/**
 * Medusa's `cancelReturnWorkflow` produces no result, so the cancel route
 * answers with an empty body.
 */
export interface VendorCancelReturnResponse {
  return?: undefined
}
