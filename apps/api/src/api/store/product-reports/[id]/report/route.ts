import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { PRODUCT_REPORT_MODULE } from "../../../../../modules/product-reports"
import ProductReportService from "../../../../../modules/product-reports/service"
import { StoreReportProductType } from "../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreReportProductType>,
  res: MedusaResponse
) => {
  const { reason, comment } = req.validatedBody
  const customerId = req.auth_context.actor_id

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [product],
  } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { id: req.params.id },
  })

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id: ${req.params.id} was not found`
    )
  }

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
