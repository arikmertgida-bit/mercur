import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { resolveKayiLogger } from "../../../../../lib/logger"
import { ADMIN_SYSTEM_ID, notifyMessengerUser } from "../../../../../lib/messenger"
import { REVIEW_NOTIFICATION_TYPE } from "../../../../../lib/review-events"
import {
  NOTIFICATION_MESSAGES,
  resolveCustomerNotificationLanguage,
} from "../../../../../lib/messenger-notification-i18n"
import { REVIEW_IMAGE_REPORT_MODULE } from "../../../../../modules/review-image-reports"
import ReviewImageReportService from "../../../../../modules/review-image-reports/service"
import { resolveReviewImageReportWorkflow } from "../../../../../workflows/review-image-report/workflows/resolve-review-image-report"
import { AdminResolveReviewImageReportType } from "../../validators"

export type AdminResolveReviewImageReportResponse = {
  success: boolean
  action: "hide" | "publish"
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminResolveReviewImageReportType>,
  res: MedusaResponse<AdminResolveReviewImageReportResponse>
) => {
  const logger = resolveKayiLogger(req.scope)
  const reportService = req.scope.resolve<ReviewImageReportService>(
    REVIEW_IMAGE_REPORT_MODULE
  )

  const [report] = await reportService.listReviewImageReports({ id: req.params.id })
  if (!report) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Review image report with id ${req.params.id} was not found`
    )
  }

  const { action } = req.validatedBody

  await resolveReviewImageReportWorkflow(req.scope).run({
    input: {
      report_id: req.params.id,
      image_id: report.review_image_id,
      action,
    },
  })

  if (report.customer_id && report.customer_id !== "anonymous") {
    const language = await resolveCustomerNotificationLanguage(req.scope, report.customer_id)
    const messages = NOTIFICATION_MESSAGES[language]
    const message =
      action === "hide"
        ? messages.review.imageHiddenPreview
        : messages.review.imagePublishedPreview

    const notified = await notifyMessengerUser({
      targetUserId: report.customer_id,
      targetUserType: "CUSTOMER",
      senderName: "Kayı.com",
      preview: message,
      sourceUserId: ADMIN_SYSTEM_ID,
      sourceUserType: "ADMIN",
      subject: messages.review.imageReportResolvedSubject,
      conversationType: "ADMIN_SUPPORT",
      notificationType: REVIEW_NOTIFICATION_TYPE,
      metadata: { notification_type: REVIEW_NOTIFICATION_TYPE },
    })
    if (!notified) {
      logger.warn(
        `[review-image-reports/resolve] Messenger notification was not accepted for report ${req.params.id}`
      )
    }
  }

  res.json({ success: true, action })
}
