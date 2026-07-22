import { ReviewReference } from "./common"

export interface CreateReviewDTO {
  reference: ReviewReference
  reference_id: string
  rating: number
  customer_note?: string | null
  customer_id: string
  /**
   * Absent for the env-configured review-bypass customer (see
   * `lib/review-bypass.ts`), who may review without a completed order.
   * Every other customer must supply the id of a completed order they own.
   */
  order_id?: string | null
}

export interface UpdateReviewDTO {
  id: string
  rating?: number
  customer_note?: string | null
  seller_note?: string | null
}
