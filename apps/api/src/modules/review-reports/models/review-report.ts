import { model } from "@medusajs/framework/utils"

/**
 * A seller's escalation of a customer review to an admin moderator
 * (vendor panel "Report to Admin"). `resolved_deleted` means the admin
 * removed the underlying review; `resolved_kept` means the admin reviewed
 * it and declined to remove it — the review stays live on the storefront.
 */
const ReviewReport = model.define("review_report", {
  id: model.id().primaryKey(),
  review_id: model.text(),
  seller_id: model.text(),
  reason: model.text(),
  status: model
    .enum(["pending", "resolved_deleted", "resolved_kept"])
    .default("pending"),
  admin_note: model.text().nullable(),
})

export default ReviewReport
