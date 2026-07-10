import { model } from "@medusajs/framework/utils"

const ReviewImage = model.define("review_image", {
  id: model.id().primaryKey(),
  review_id: model.text(),
  url: model.text(),
  is_hidden: model.boolean().default(false),
})

export default ReviewImage
