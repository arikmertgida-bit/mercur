import {
  DeleteResponse,
  PaginatedResponse,
  SalesChannelDTO,
  ShippingProfileDTO,
} from "@medusajs/types"
import { ProductDTO, ProductVariantDTO } from "../product/common"

/**
 * A product as the admin product detail routes send it: Mercur's product plus
 * the linked sales channels and shipping profile the admin queries can select.
 */
export type AdminProduct = ProductDTO & {
  sales_channels?: SalesChannelDTO[]
  shipping_profile?: ShippingProfileDTO | null
}

export interface AdminProductResponse {
  product: AdminProduct
}

export type AdminProductListResponse = PaginatedResponse<{
  products: ProductDTO[]
}>

export type AdminProductDeleteResponse = DeleteResponse<"product">

export interface AdminProductVariantResponse {
  variant: ProductVariantDTO
}

export type AdminProductVariantListResponse = PaginatedResponse<{
  variants: ProductVariantDTO[]
}>

/**
 * A product as the vendor product routes send it: Mercur's product plus the
 * linked sales channels and shipping profile the vendor queries can select.
 */
export type VendorProduct = ProductDTO & {
  sales_channels?: SalesChannelDTO[]
  shipping_profile?: ShippingProfileDTO | null
}

export interface VendorProductResponse {
  /**
   * The product's details.
   */
  product: VendorProduct
}

export type VendorProductListResponse = PaginatedResponse<{
  /**
   * The list of products.
   */
  products: VendorProduct[]
}>

export interface VendorProductVariantResponse {
  /**
   * The product variant's details.
   */
  variant: ProductVariantDTO
}

export type VendorProductVariantListResponse = PaginatedResponse<{
  /**
   * The list of product variants.
   */
  variants: ProductVariantDTO[]
}>

export interface VendorDeleteResponse {
  /**
   * The ID of the deleted resource.
   */
  id: string
  /**
   * The type of the deleted resource.
   */
  object: string
  /**
   * Whether the resource was deleted.
   */
  deleted: boolean
}
