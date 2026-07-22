import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import type {} from "@mercurjs/core/types/seller-context";

import { ReviewReportRowSchema, parseRows } from "../../../lib/graph-schemas";
import { REVIEW_REPORT_MODULE } from "../../../modules/review-reports";
import ReviewReportService from "../../../modules/review-reports/service";
import { validateSellerReview } from "../reviews/helpers";
import { VendorCreateReviewReportType } from "./validators";

export type VendorReviewReportRow = {
  id: string;
  review_id: string;
  seller_id: string;
  reason: string;
  status: "pending" | "resolved_deleted" | "resolved_kept";
  admin_note?: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

export type VendorReviewReportListResponse = {
  reports: VendorReviewReportRow[];
  count: number;
  offset: number;
  limit: number;
};

export type VendorReviewReportResponse = {
  report: VendorReviewReportRow;
};

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<VendorReviewReportListResponse>
): Promise<void> => {
  const sellerId = req.seller_context?.seller_id;
  if (!sellerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Authenticated seller not found"
    );
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: reports, metadata } = await query.graph({
    entity: "review_report",
    fields: req.queryConfig.fields,
    filters: { ...req.filterableFields, seller_id: sellerId },
    pagination: req.queryConfig.pagination,
  });

  res.json({
    reports: parseRows(ReviewReportRowSchema, reports),
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorCreateReviewReportType>,
  res: MedusaResponse<VendorReviewReportResponse>
): Promise<void> => {
  const sellerId = req.seller_context?.seller_id;
  if (!sellerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Authenticated seller not found"
    );
  }

  const { review_id, reason } = req.validatedBody;

  await validateSellerReview(req.scope, sellerId, review_id);

  const reportService = req.scope.resolve<ReviewReportService>(
    REVIEW_REPORT_MODULE
  );
  const report = await reportService.createReviewReports({
    review_id,
    seller_id: sellerId,
    reason,
    status: "pending",
  });

  res.status(201).json({ report });
};
