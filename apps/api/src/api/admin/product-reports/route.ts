import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  buildCustomerDisplayName,
  CustomerSummarySchema,
  ProductDetailRowSchema,
  ProductReportRowSchema,
  parseRows,
} from "../../../lib/graph-schemas"
import { AdminGetProductReportsParamsType } from "./validators"

export type AdminProductReportRow = {
  id: string
  product_id: string
  customer_id: string
  reason: string
  comment?: string | null | undefined
  status: string
  created_at: string | Date
  updated_at: string | Date
  customer_name: string
  product_title: string
  product_handle: string | null
  product_thumbnail: string | null
  product_status: string | null
  seller_id: string | null
  seller_name: string | null
  seller_handle: string | null
}

export type AdminProductReportsListResponse = {
  product_reports: AdminProductReportRow[]
  count: number
  offset: number
  limit: number
}

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetProductReportsParamsType>,
  res: MedusaResponse<AdminProductReportsListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: reports, metadata } = await query.graph({
    entity: "product_report",
    fields: [
      "id",
      "product_id",
      "customer_id",
      "reason",
      "comment",
      "status",
      "created_at",
      "updated_at",
    ],
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  })

  const parsedReports = parseRows(ProductReportRowSchema, reports)

  const customerIds = [
    ...new Set(parsedReports.map((report) => report.customer_id).filter(Boolean)),
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

  const productIds = [
    ...new Set(parsedReports.map((report) => report.product_id).filter(Boolean)),
  ]
  const productInfo: Record<string, {
    title: string
    handle: string | null
    thumbnail: string | null
    status: string
    seller_id: string | null
    seller_name: string | null
    seller_handle: string | null
  }> = {}
  if (productIds.length > 0) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "handle",
        "thumbnail",
        "status",
        "seller.id",
        "seller.name",
        "seller.handle",
      ],
      filters: { id: productIds },
    })
    for (const product of parseRows(ProductDetailRowSchema, products)) {
      productInfo[product.id] = {
        title: product.title,
        handle: product.handle,
        thumbnail: product.thumbnail,
        status: product.status,
        seller_id: product.seller?.id ?? null,
        seller_name: product.seller?.name ?? null,
        seller_handle: product.seller?.handle ?? null,
      }
    }
  }

  const product_reports = parsedReports.map((report) => {
    const info = productInfo[report.product_id]
    return {
      ...report,
      customer_name: customerNames[report.customer_id] ?? report.customer_id,
      product_title: info?.title ?? report.product_id,
      product_handle: info?.handle ?? null,
      product_thumbnail: info?.thumbnail ?? null,
      product_status: info?.status ?? null,
      seller_id: info?.seller_id ?? null,
      seller_name: info?.seller_name ?? null,
      seller_handle: info?.seller_handle ?? null,
    }
  })

  res.json({
    product_reports,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}
