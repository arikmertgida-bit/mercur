// The vendor price-list routes flatten rules/prices exactly like Medusa's
// admin routes (core `toHttpPriceList`), so the wire shape is the HTTP type.
import { HttpTypes, PaginatedResponse } from "@medusajs/types"

export interface VendorPriceListResponse {
  /**
   * The price list's details.
   */
  price_list: HttpTypes.AdminPriceList
}

export type VendorPriceListListResponse = PaginatedResponse<{
  /**
   * The list of price lists.
   */
  price_lists: HttpTypes.AdminPriceList[]
}>

export type VendorPriceListPricesResponse = PaginatedResponse<{
  prices: HttpTypes.AdminPrice[]
}>

export interface VendorPriceListBatchResponse {
  created: HttpTypes.AdminPrice[]
  updated: HttpTypes.AdminPrice[]
  deleted: {
    id: string[]
    object: "price"
    deleted: boolean
  }
}

export type PriceListProductGroupDTO = {
  product_id: string
  variant_count: number
  product: {
    title: string
    thumbnail: string | null
    status: string
    created_at: string
    updated_at: string
    categories?: { id: string; name: string }[] | null
    collection?: { id: string; title: string } | null
  }
}

export type VendorPriceListProductsListResponse = PaginatedResponse<{
  /**
   * The products that have at least one price in this price list, one row
   * per product with a variant count — a price has no `variant_id`/
   * `offer_id` column of its own, so this is resolved through the
   * variant's price_set rather than exposed as a raw price filter.
   */
  products: PriceListProductGroupDTO[]
}>
