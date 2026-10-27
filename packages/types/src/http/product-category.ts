import { DeleteResponse, PaginatedResponse } from "@medusajs/types"
import { ProductCategoryDTO, ProductDTO } from "../product/common"
import { VendorMediaImage } from "./media-image"

// The vendor category routes select the category's `media_images` link by default.
export type VendorProductCategory = ProductCategoryDTO & {
  media_images?: VendorMediaImage[] | null
}

// The admin category routes select the category's `media_images` link by default.
export type AdminProductCategory = ProductCategoryDTO & {
  media_images?: VendorMediaImage[] | null
}

export interface AdminProductCategoryResponse {
  product_category: AdminProductCategory
}

export type AdminProductCategoryListResponse = PaginatedResponse<{
  product_categories: AdminProductCategory[]
}>

export type AdminProductCategoryDeleteResponse =
  DeleteResponse<"product_category">

export interface VendorProductCategoryResponse {
  product_category: VendorProductCategory
}

export type VendorProductCategoryListResponse = PaginatedResponse<{
  product_categories: VendorProductCategory[]
}>

export type VendorProductCategoryProductsResponse = PaginatedResponse<{
  products: ProductDTO[]
}>
