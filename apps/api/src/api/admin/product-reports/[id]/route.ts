import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { PRODUCT_REPORT_MODULE } from "../../../../modules/product-reports"
import ProductReportService from "../../../../modules/product-reports/service"
import { deleteProductReportWorkflow } from "../../../../workflows/product-report/workflows/delete-product-report"
import { updateProductReportWorkflow } from "../../../../workflows/product-report/workflows/update-product-report"
import { AdminUpdateProductReportType } from "../validators"

export type AdminUpdateProductReportResponse = {
  success: boolean
  status: "pending" | "resolved" | "dismissed"
}

export type AdminDeleteProductReportResponse = {
  success: boolean
  deleted: boolean
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateProductReportType>,
  res: MedusaResponse<AdminUpdateProductReportResponse>
) => {
  const reportService = req.scope.resolve<ProductReportService>(PRODUCT_REPORT_MODULE)
  const [report] = await reportService.listProductReports({ id: req.params.id })
  if (!report) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product report with id ${req.params.id} was not found`
    )
  }

  const { result } = await updateProductReportWorkflow(req.scope).run({
    input: { id: req.params.id, status: req.validatedBody.status },
  })

  res.json(result)
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminDeleteProductReportResponse>
) => {
  const reportService = req.scope.resolve<ProductReportService>(PRODUCT_REPORT_MODULE)
  const [report] = await reportService.listProductReports({ id: req.params.id })
  if (!report) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product report with id ${req.params.id} was not found`
    )
  }

  await deleteProductReportWorkflow(req.scope).run({
    input: { id: req.params.id },
  })

  res.json({ success: true, deleted: true })
}
