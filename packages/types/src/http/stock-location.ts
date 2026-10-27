import { HttpTypes, PaginatedResponse } from "@medusajs/types"

// The vendor stock location routes serialize the same location graph the
// admin routes do (address, sales channels, fulfillment providers and
// fulfillment sets as linked fields, string dates), so the wire shape is
// Medusa's HTTP stock location — not the module `StockLocationDTO`.
export type VendorStockLocation = HttpTypes.AdminStockLocation

export interface VendorStockLocationResponse {
  /**
   * The stock location's details.
   */
  stock_location: VendorStockLocation
}

export type VendorStockLocationListResponse = PaginatedResponse<{
  /**
   * The list of stock locations.
   */
  stock_locations: VendorStockLocation[]
}>
