import { model } from "@medusajs/framework/utils"

export const ReviewReply = model.define("review_reply", {
  id: model.id({ prefix: "revrp" }).primaryKey(),
  review_id: model.text(),
  content: model.text(),
  is_seller_reply: model.boolean().default(false),
  customer_id: model.text().nullable(),
  seller_id: model.text().nullable(),
})
