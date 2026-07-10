import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"

import { REVIEW_IMAGE_MODULE } from "../../../../../modules/review-images"
import ReviewImageService from "../../../../../modules/review-images/service"
import { REVIEW_IMAGE_REPORT_MODULE } from "../../../../../modules/review-image-reports"
import ReviewImageReportService from "../../../../../modules/review-image-reports/service"
import { StoreReportReviewImageType } from "../../validators"

export type StoreReportReviewImageResponse = {
  success: boolean
}

export const POST = async (
  req: MedusaStoreRequest<StoreReportReviewImageType>,
  res: MedusaResponse<StoreReportReviewImageResponse>
) => {
  const { reason } = req.validatedBody
  const customerId = req.auth_context?.actor_id ?? "anonymous"

  const reviewImageService = req.scope.resolve<ReviewImageService>(REVIEW_IMAGE_MODULE)
  const reportService = req.scope.resolve<ReviewImageReportService>(REVIEW_IMAGE_REPORT_MODULE)

  await reviewImageService.updateReviewImages({
    id: req.params.id,
    is_hidden: true,
  })

  await reportService.createReviewImageReports([
    {
      review_image_id: req.params.id,
      customer_id: customerId,
      reason,
      status: "pending",
    },
  ])

  res.json({ success: true })
}
