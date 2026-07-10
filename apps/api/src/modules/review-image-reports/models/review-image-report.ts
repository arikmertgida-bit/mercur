import { model } from "@medusajs/framework/utils"

const ReviewImageReport = model.define("review_image_report", {
  id: model.id().primaryKey(),
  review_image_id: model.text(),
  customer_id: model.text(),
  reason: model.text(),
  status: model.enum(["pending", "resolved"]).default("pending"),
  action_taken: model.enum(["hidden", "published"]).nullable(),
})

export default ReviewImageReport
