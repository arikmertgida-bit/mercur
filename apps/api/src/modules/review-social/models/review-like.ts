import { model } from "@medusajs/framework/utils"

export const ReviewLike = model.define("review_like", {
  id: model.id({ prefix: "revlk" }).primaryKey(),
  review_id: model.text(),
  customer_id: model.text(),
})
