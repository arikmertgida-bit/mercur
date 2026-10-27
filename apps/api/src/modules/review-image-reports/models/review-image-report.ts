import { model } from "@medusajs/framework/utils"

import {
  REVIEW_IMAGE_REPORT_ACTIONS,
  REVIEW_IMAGE_REPORT_STATUSES,
} from "../constants"

const ReviewImageReport = model.define("review_image_report", {
  id: model.id().primaryKey(),
  review_image_id: model.text(),
  customer_id: model.text(),
  reason: model.text(),
  status: model.enum([...REVIEW_IMAGE_REPORT_STATUSES]).default("pending"),
  action_taken: model.enum([...REVIEW_IMAGE_REPORT_ACTIONS]).nullable(),
})

export default ReviewImageReport
