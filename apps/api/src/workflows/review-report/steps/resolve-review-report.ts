import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import { REVIEW_REPORT_MODULE } from "../../../modules/review-reports"
import ReviewReportService from "../../../modules/review-reports/service"
import { REVIEW_MODULE, ReviewModuleService } from "../../../modules/reviews"

type ResolveReviewReportInput = {
  report_id: string
  action: "delete" | "reject"
  admin_note: string
}

type ResolveReviewReportCompensateInput = {
  report_id: string
  review_id: string
  action: "delete" | "reject"
  previous_status: "pending" | "resolved_deleted" | "resolved_kept"
  previous_admin_note: string | null
}

export const resolveReviewReportStep = createStep(
  "resolve-review-report",
  async (input: ResolveReviewReportInput, { container }) => {
    const reportService = container.resolve<ReviewReportService>(
      REVIEW_REPORT_MODULE
    )
    const reviewService = container.resolve<ReviewModuleService>(REVIEW_MODULE)

    const previousReport = await reportService.retrieveReviewReport(
      input.report_id
    )

    if (input.action === "delete") {
      await reviewService.softDeleteReviews(previousReport.review_id)
      await reportService.updateReviewReports({
        id: input.report_id,
        status: "resolved_deleted",
        admin_note: input.admin_note,
      })
    } else {
      await reportService.updateReviewReports({
        id: input.report_id,
        status: "resolved_kept",
        admin_note: input.admin_note,
      })
    }

    return new StepResponse(
      { success: true, action: input.action },
      {
        report_id: input.report_id,
        review_id: previousReport.review_id,
        action: input.action,
        previous_status: previousReport.status,
        previous_admin_note: previousReport.admin_note,
      }
    )
  },
  async (
    compensateInput: ResolveReviewReportCompensateInput | undefined,
    { container }
  ) => {
    if (!compensateInput) {
      return
    }

    const reportService = container.resolve<ReviewReportService>(
      REVIEW_REPORT_MODULE
    )
    const reviewService = container.resolve<ReviewModuleService>(REVIEW_MODULE)
    const { report_id, review_id, action, previous_status, previous_admin_note } =
      compensateInput

    if (action === "delete") {
      await reviewService.restoreReviews(review_id)
    }

    await reportService.updateReviewReports({
      id: report_id,
      status: previous_status,
      admin_note: previous_admin_note,
    })
  }
)
