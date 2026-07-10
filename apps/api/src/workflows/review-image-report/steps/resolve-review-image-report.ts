import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import { REVIEW_IMAGE_REPORT_MODULE } from "../../../modules/review-image-reports"
import ReviewImageReportService from "../../../modules/review-image-reports/service"
import ReviewImageService from "../../../modules/review-images/service"
import { REVIEW_IMAGE_MODULE } from "../../../modules/review-images"

type ResolveReviewImageReportInput = {
  report_id: string
  image_id: string
  action: "hide" | "publish"
}

type ResolveReviewImageReportCompensateInput = {
  report_id: string
  image_id: string
  action: "hide" | "publish"
  previous_status: "pending" | "resolved"
  previous_action_taken: "hidden" | "published" | null
  previous_is_hidden: boolean
}

export const resolveReviewImageReportStep = createStep(
  "resolve-review-image-report",
  async (input: ResolveReviewImageReportInput, { container }) => {
    const reportService = container.resolve<ReviewImageReportService>(
      REVIEW_IMAGE_REPORT_MODULE
    )
    const reviewImageService = container.resolve<ReviewImageService>(
      REVIEW_IMAGE_MODULE
    )

    const previousReport = await reportService.retrieveReviewImageReport(
      input.report_id
    )
    const previousImage = await reviewImageService.retrieveReviewImage(
      input.image_id
    )

    if (input.action === "hide") {
      await reviewImageService.deleteReviewImages([input.image_id])
      await reportService.updateReviewImageReports({
        id: input.report_id,
        status: "resolved",
        action_taken: "hidden",
      })
    } else {
      await reviewImageService.updateReviewImages({
        id: input.image_id,
        is_hidden: false,
      })
      await reportService.updateReviewImageReports({
        id: input.report_id,
        status: "resolved",
        action_taken: "published",
      })
    }

    return new StepResponse(
      { success: true, action: input.action },
      {
        report_id: input.report_id,
        image_id: input.image_id,
        action: input.action,
        previous_status: previousReport.status,
        previous_action_taken: previousReport.action_taken,
        previous_is_hidden: previousImage.is_hidden,
      }
    )
  },
  async (
    compensateInput: ResolveReviewImageReportCompensateInput | undefined,
    { container }
  ) => {
    if (!compensateInput) {
      return
    }

    const reportService = container.resolve<ReviewImageReportService>(
      REVIEW_IMAGE_REPORT_MODULE
    )
    const reviewImageService = container.resolve<ReviewImageService>(
      REVIEW_IMAGE_MODULE
    )
    const { report_id, image_id, action, previous_status, previous_action_taken, previous_is_hidden } =
      compensateInput

    if (action === "hide") {
      await reviewImageService.restoreReviewImages([image_id])
    } else {
      await reviewImageService.updateReviewImages({
        id: image_id,
        is_hidden: previous_is_hidden,
      })
    }

    await reportService.updateReviewImageReports({
      id: report_id,
      status: previous_status,
      action_taken: previous_action_taken,
    })
  }
)
