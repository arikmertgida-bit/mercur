import { model } from "@medusajs/framework/utils"

const ReviewReplyImage = model.define("review_reply_image", {
  id: model.id().primaryKey(),
  review_reply_id: model.text(),
  url: model.text(),
})

export default ReviewReplyImage
