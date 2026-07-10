import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"

import { PRODUCT_REPORT_MODULE } from "../../../../../modules/product-reports"
import ProductReportService from "../../../../../modules/product-reports/service"
import { StoreReportProductType } from "../../validators"

export const POST = async (
  req: MedusaStoreRequest<StoreReportProductType>,
  res: MedusaResponse
) => {
  const { reason, comment } = req.validatedBody
  const customerId = req.auth_context?.actor_id ?? "anonymous"

  const reportService = req.scope.resolve<ProductReportService>(PRODUCT_REPORT_MODULE)

  await reportService.createProductReports([
    {
      product_id: req.params.id,
      customer_id: customerId,
      reason,
      comment,
      status: "pending",
    },
  ])

  res.status(201).json({ success: true })
}
