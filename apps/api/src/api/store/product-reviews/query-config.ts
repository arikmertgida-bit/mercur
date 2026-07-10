export const storeProductReviewFields = [
  "review.id",
  "review.reference",
  "review.rating",
  "review.customer_note",
  "review.seller_note",
  "review.created_at",
  "review.updated_at",
  "review.customer.first_name",
  "review.customer.last_name",
]

export const storeProductReviewQueryConfig = {
  list: {
    defaults: storeProductReviewFields,
    defaultLimit: 50,
    isList: true,
  },
}
