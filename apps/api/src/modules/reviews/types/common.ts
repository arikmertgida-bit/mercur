import { DeleteResponse, PaginatedResponse } from "@mercurjs/types"

export type ReviewReference = "product" | "seller"

export interface ReviewDTO {
  id: string
  reference: ReviewReference
  rating: number
  customer_note: string | null
  seller_note: string | null
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

export interface AdminReviewResponse {
  review: ReviewDTO
}

export type AdminReviewListResponse = PaginatedResponse<{
  reviews: ReviewDTO[]
}>

export interface StoreReviewResponse {
  review: ReviewDTO
}

export type StoreReviewListResponse = PaginatedResponse<{
  reviews: ReviewDTO[]
}>

export type StoreReviewDeleteResponse = DeleteResponse<"review">

export interface VendorReviewResponse {
  review: ReviewDTO
}

export type VendorReviewListResponse = PaginatedResponse<{
  reviews: ReviewDTO[]
}>

export interface ReviewImageDTO {
  id: string
  url: string
  is_hidden: boolean
}

export interface VendorReviewWithImagesDTO extends ReviewDTO {
  images: ReviewImageDTO[]
}

export interface VendorReviewDetailResponse {
  review: VendorReviewWithImagesDTO
}

export type VendorReviewListWithImagesResponse = PaginatedResponse<{
  reviews: VendorReviewWithImagesDTO[]
}>
