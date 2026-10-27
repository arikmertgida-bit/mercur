import {
  HttpTypes,
  PaginatedResponse,
  ProductCollectionDTO,
} from "@medusajs/types"

import { VendorMediaImage } from "./media-image"

// The vendor collection routes select the collection's `media_images` link by default.
export type VendorCollection = ProductCollectionDTO & {
  media_images?: VendorMediaImage[] | null
}

export interface VendorCollectionResponse {
  /**
   * The collection's details.
   */
  collection: VendorCollection
}

export type VendorCollectionListResponse = PaginatedResponse<{
  /**
   * The list of collections.
   */
  collections: VendorCollection[]
}>

// The admin collection routes select the collection's `media_images` link by default.
export type AdminCollection = HttpTypes.AdminCollection & {
  media_images?: VendorMediaImage[] | null
}

export interface AdminCollectionResponse {
  /**
   * The collection's details.
   */
  collection: AdminCollection
}

export type AdminCollectionListResponse = PaginatedResponse<{
  /**
   * The list of collections.
   */
  collections: AdminCollection[]
}>
