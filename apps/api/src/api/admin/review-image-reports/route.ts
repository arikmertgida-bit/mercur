import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  CustomerSummarySchema,
  ReviewImageReportRowSchema,
  ReviewImageRowSchema,
  buildCustomerDisplayName,
  parseRows,
} from "../../../lib/graph-schemas"
import { AdminGetReviewImageReportsParamsType } from "./validators"

export type AdminReviewImageReportRow = {
  id: string
  review_image_id: string
  customer_id: string
  reason: string
  status: string
  action_taken?: string | null | undefined
  created_at: string | Date
  updated_at: string | Date
  customer_name: string
  image_url: string | null
  image_is_hidden: boolean | null
}

export type AdminReviewImageReportsListResponse = {
  reports: AdminReviewImageReportRow[]
  count: number
}

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetReviewImageReportsParamsType>,
  res: MedusaResponse<AdminReviewImageReportsListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: reports, metadata } = await query.graph({
    entity: "review_image_report",
    fields: [
      "id",
      "review_image_id",
      "customer_id",
      "reason",
      "status",
      "action_taken",
      "created_at",
      "updated_at",
    ],
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  })

  const parsedReports = parseRows(ReviewImageReportRowSchema, reports)

  const imageIds = [
    ...new Set(parsedReports.map((report) => report.review_image_id).filter(Boolean)),
  ]
  const images: Record<string, { url: string; is_hidden: boolean }> = {}
  if (imageIds.length > 0) {
    const { data: imageRows } = await query.graph({
      entity: "review_image",
      fields: ["id", "review_id", "url", "is_hidden"],
      filters: { id: imageIds },
    })
    for (const image of parseRows(ReviewImageRowSchema, imageRows)) {
      images[image.id] = { url: image.url, is_hidden: image.is_hidden }
    }
  }

  const customerIds = [
    ...new Set(
      parsedReports
        .map((report) => report.customer_id)
        .filter((id) => id && id !== "anonymous")
    ),
  ]
  const customerNames: Record<string, string> = {}
  if (customerIds.length > 0) {
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "first_name", "last_name", "email"],
      filters: { id: customerIds },
    })
    for (const customer of parseRows(CustomerSummarySchema, customers)) {
      customerNames[customer.id] = buildCustomerDisplayName(customer)
    }
  }

  const reportRows = parsedReports.map((report) => {
    const image = images[report.review_image_id]
    return {
      ...report,
      customer_name:
        report.customer_id === "anonymous"
          ? "Misafir"
          : (customerNames[report.customer_id] ?? report.customer_id),
      image_url: image?.url ?? null,
      image_is_hidden: image?.is_hidden ?? null,
    }
  })

  res.json({ reports: reportRows, count: metadata?.count ?? 0 })
}
