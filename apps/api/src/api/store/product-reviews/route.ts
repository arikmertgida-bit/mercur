import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"

import productReview from "../../../links/product-review"
import { REVIEW_IMAGE_MODULE } from "../../../modules/review-images"
import ReviewImageService from "../../../modules/review-images/service"
import { ProductReviewRowSchema, parseRows } from "../../../lib/graph-schemas"
import { StoreGetProductReviewsParamsType } from "./validators"

export type StoreProductReviewRow = {
  id: string
  reference: string
  reference_id: string
  rating: number
  customer_note: string | null
  seller_note: string | null
  created_at: string | Date
  updated_at: string | Date
  customer: { first_name: string; last_name: string } | null
  images: Array<{ id: string; url: string; is_hidden: boolean }>
}

export type StoreProductReviewsResponse = {
  reviews: StoreProductReviewRow[]
  count: number
  average_rating: number
}

export const GET = async (
  req: MedusaRequest<never, StoreGetProductReviewsParamsType>,
  res: MedusaResponse<StoreProductReviewsResponse>
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const productId = req.validatedQuery.product_id

  const { data: relations, metadata } = await query.graph({
    entity: productReview.entryPoint,
    fields: req.queryConfig.fields,
    filters: { product_id: productId },
    pagination: req.queryConfig.pagination,
  })

  const reviews = parseRows(
    ProductReviewRowSchema,
    relations.map((relation) => relation.review).filter((review) => review != null)
  )

  const reviewIds = reviews.map((review) => review.id)
  const imagesByReview: Record<
    string,
    Array<{ id: string; url: string; is_hidden: boolean }>
  > = {}

  if (reviewIds.length > 0) {
    const reviewImageService =
      req.scope.resolve<ReviewImageService>(REVIEW_IMAGE_MODULE)
    const images = await reviewImageService.listReviewImages({
      review_id: reviewIds,
      is_hidden: false,
    })
    for (const image of images) {
      const list = imagesByReview[image.review_id] ?? []
      list.push({ id: image.id, url: image.url, is_hidden: image.is_hidden })
      imagesByReview[image.review_id] = list
    }
  }

  const { data: allRatingsRelations } = await query.graph({
    entity: productReview.entryPoint,
    fields: ["review.rating"],
    filters: { product_id: productId },
  })
  const allRatings = allRatingsRelations
    .map((relation) => relation.review?.rating)
    .filter((rating): rating is number => typeof rating === "number")
  const averageRating =
    allRatings.length > 0
      ? Math.round(
          (allRatings.reduce((sum, rating) => sum + rating, 0) /
            allRatings.length) *
            10
        ) / 10
      : 0

  res.json({
    reviews: reviews.map((review) => ({
      id: review.id,
      reference: review.reference,
      reference_id: productId,
      rating: review.rating,
      customer_note: review.customer_note ?? null,
      seller_note: review.seller_note ?? null,
      created_at: review.created_at,
      updated_at: review.updated_at,
      customer: review.customer
        ? {
            first_name: review.customer.first_name ?? "",
            last_name: review.customer.last_name ?? "",
          }
        : null,
      images: imagesByReview[review.id] ?? [],
    })),
    count: metadata?.count ?? 0,
    average_rating: averageRating,
  })
}
