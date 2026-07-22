import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";

import {
  ReviewReportRowSchema,
  ReviewSummaryRowSchema,
  SellerSummarySchema,
  parseFirstRow,
} from "../../../../lib/graph-schemas";
import { REVIEW_IMAGE_MODULE } from "../../../../modules/review-images";
import ReviewImageService from "../../../../modules/review-images/service";

export type AdminReviewReportDetailResponse = {
  report: {
    id: string;
    review_id: string;
    seller_id: string;
    seller_name: string;
    reason: string;
    status: "pending" | "resolved_deleted" | "resolved_kept";
    admin_note?: string | null;
    created_at: string | Date;
    updated_at: string | Date;
    review: {
      id: string;
      reference: string;
      rating: number;
      customer_note: string | null | undefined;
      seller_note: string | null | undefined;
      images: { id: string; url: string; is_hidden: boolean }[];
    } | null;
  };
};

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminReviewReportDetailResponse>
): Promise<void> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: reports } = await query.graph({
    entity: "review_report",
    fields: [
      "id",
      "review_id",
      "seller_id",
      "reason",
      "status",
      "admin_note",
      "created_at",
      "updated_at",
    ],
    filters: { id: req.params.id },
  });

  const report = parseFirstRow(ReviewReportRowSchema, reports);
  if (!report) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Review report with id: ${req.params.id} was not found`
    );
  }

  const { data: sellers } = await query.graph({
    entity: "seller",
    fields: ["id", "name"],
    filters: { id: report.seller_id },
  });
  const seller = parseFirstRow(SellerSummarySchema, sellers);

  const { data: reviews } = await query.graph({
    entity: "review",
    fields: ["id", "reference", "rating", "customer_note", "seller_note"],
    filters: { id: report.review_id },
  });
  const review = parseFirstRow(ReviewSummaryRowSchema, reviews);

  let images: { id: string; url: string; is_hidden: boolean }[] = [];
  if (review) {
    const reviewImageService = req.scope.resolve<ReviewImageService>(
      REVIEW_IMAGE_MODULE
    );
    const imageRows = await reviewImageService.listReviewImages({
      review_id: review.id,
    });
    images = imageRows.map((image) => ({
      id: image.id,
      url: image.url,
      is_hidden: image.is_hidden,
    }));
  }

  res.json({
    report: {
      ...report,
      seller_name: seller?.name ?? report.seller_id,
      review: review
        ? {
            id: review.id,
            reference: review.reference,
            rating: review.rating,
            customer_note: review.customer_note,
            seller_note: review.seller_note,
            images,
          }
        : null,
    },
  });
};
