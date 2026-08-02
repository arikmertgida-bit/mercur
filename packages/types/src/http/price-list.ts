import { PaginatedResponse, PriceListDTO } from "@medusajs/types"

export interface VendorPriceListResponse {
  /**
   * The price list's details.
   */
  price_list: PriceListDTO
}

export type VendorPriceListListResponse = PaginatedResponse<{
  /**
   * The list of price lists.
   */
  price_lists: PriceListDTO[]
}>

export type VendorPriceListPricesResponse = PaginatedResponse<{
  prices: Record<string, unknown>[]
}>

export interface VendorPriceListBatchResponse {
  created: Record<string, unknown>[]
  updated: Record<string, unknown>[]
  deleted: Record<string, unknown>
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
