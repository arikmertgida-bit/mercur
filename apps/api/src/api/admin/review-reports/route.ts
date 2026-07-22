import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import {
  ReviewReportRowSchema,
  ReviewSummaryRowSchema,
  SellerSummarySchema,
  parseRows,
} from "../../../lib/graph-schemas";

export type AdminReviewReportRow = {
  id: string;
  review_id: string;
  seller_id: string;
  reason: string;
  status: "pending" | "resolved_deleted" | "resolved_kept";
  admin_note?: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  seller_name: string;
  review_rating: number | null;
  review_customer_note: string | null;
};

export type AdminReviewReportsListResponse = {
  reports: AdminReviewReportRow[];
  count: number;
};

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminReviewReportsListResponse>
): Promise<void> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: reports, metadata } = await query.graph({
    entity: "review_report",
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  });

  const parsedReports = parseRows(ReviewReportRowSchema, reports);

  const sellerIds = [...new Set(parsedReports.map((report) => report.seller_id))];
  const sellerNames: Record<string, string> = {};
  if (sellerIds.length > 0) {
    const { data: sellers } = await query.graph({
      entity: "seller",
      fields: ["id", "name"],
      filters: { id: sellerIds },
    });
    for (const seller of parseRows(SellerSummarySchema, sellers)) {
      sellerNames[seller.id] = seller.name;
    }
  }

  const reviewIds = [...new Set(parsedReports.map((report) => report.review_id))];
  const reviewsById: Record<
    string,
    { rating: number; customer_note: string | null | undefined }
  > = {};
  if (reviewIds.length > 0) {
    const { data: reviews } = await query.graph({
      entity: "review",
      fields: ["id", "reference", "rating", "customer_note", "seller_note"],
      filters: { id: reviewIds },
    });
    for (const review of parseRows(ReviewSummaryRowSchema, reviews)) {
      reviewsById[review.id] = {
        rating: review.rating,
        customer_note: review.customer_note,
      };
    }
  }

  const reportRows: AdminReviewReportRow[] = parsedReports.map((report) => ({
    ...report,
    seller_name: sellerNames[report.seller_id] ?? report.seller_id,
    review_rating: reviewsById[report.review_id]?.rating ?? null,
    review_customer_note: reviewsById[report.review_id]?.customer_note ?? null,
  }));

  res.json({ reports: reportRows, count: metadata?.count ?? 0 });
};
