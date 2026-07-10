export const adminReviewImageReportFields = [
  "id",
  "review_image_id",
  "customer_id",
  "reason",
  "status",
  "action_taken",
  "created_at",
  "updated_at",
]

export const adminReviewImageReportQueryConfig = {
  list: {
    defaults: adminReviewImageReportFields,
    defaultLimit: 20,
    isList: true,
  },
}
