import { model } from "@medusajs/framework/utils"

export const ReviewReplyLike = model.define("review_reply_like", {
  id: model.id({ prefix: "revrplk" }).primaryKey(),
  reply_id: model.text(),
  customer_id: model.text(),
})
