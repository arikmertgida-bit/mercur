import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import { resolveKayiLogger } from "../../../../../lib/logger";
import { ADMIN_SYSTEM_ID, notifyMessengerUser } from "../../../../../lib/messenger";
import { REVIEW_NOTIFICATION_TYPE } from "../../../../../lib/review-events";
import {
  NOTIFICATION_MESSAGES,
  resolveSellerNotificationLanguage,
} from "../../../../../lib/messenger-notification-i18n";
import { REVIEW_REPORT_MODULE } from "../../../../../modules/review-reports";
import ReviewReportService from "../../../../../modules/review-reports/service";
import { resolveReviewReportWorkflow } from "../../../../../workflows/review-report/workflows/resolve-review-report";
import { AdminResolveReviewReportType } from "../../validators";

export type AdminResolveReviewReportResponse = {
  success: boolean;
  action: "delete" | "reject";
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminResolveReviewReportType>,
  res: MedusaResponse<AdminResolveReviewReportResponse>
): Promise<void> => {
  const logger = resolveKayiLogger(req.scope);
  const reportService = req.scope.resolve<ReviewReportService>(
    REVIEW_REPORT_MODULE
  );
  const report = await reportService.retrieveReviewReport(req.params.id);

  const { action, admin_note } = req.validatedBody;

  await resolveReviewReportWorkflow.run({
    container: req.scope,
    input: { report_id: req.params.id, action, admin_note },
  });

  const language = await resolveSellerNotificationLanguage(req.scope, report.seller_id);
  const messages = NOTIFICATION_MESSAGES[language];
  const preview =
    action === "delete"
      ? messages.review.reportDeletedPreview
      : messages.review.reportRejectedPreview;

  const notified = await notifyMessengerUser({
    targetUserId: report.seller_id,
    targetUserType: "SELLER",
    senderName: "Kayı.com",
    preview,
    sourceUserId: ADMIN_SYSTEM_ID,
    sourceUserType: "ADMIN",
    subject: messages.review.reportResolvedSubject,
    conversationType: "ADMIN_SUPPORT",
    notificationType: REVIEW_NOTIFICATION_TYPE,
    metadata: { notification_type: REVIEW_NOTIFICATION_TYPE },
  });
  if (!notified) {
    logger.warn(
      `[review-reports/resolve] Messenger notification was not accepted for report ${req.params.id}`
    );
  }

  res.json({ success: true, action });
};
