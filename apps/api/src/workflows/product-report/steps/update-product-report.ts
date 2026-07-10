import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import { PRODUCT_REPORT_MODULE } from "../../../modules/product-reports"
import ProductReportService from "../../../modules/product-reports/service"

type UpdateProductReportInput = {
  id: string
  status: "pending" | "resolved" | "dismissed"
}

export const updateProductReportStep = createStep(
  "update-product-report",
  async (input: UpdateProductReportInput, { container }) => {
    const service = container.resolve<ProductReportService>(PRODUCT_REPORT_MODULE)

    const [report] = await service.listProductReports({ id: input.id })
    const previousStatus = report?.status ?? null

    await service.updateProductReports({ id: input.id, status: input.status })

    return new StepResponse(
      { success: true, status: input.status },
      { id: input.id, previous_status: previousStatus }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.previous_status) {
      return
    }

    const service = container.resolve<ProductReportService>(PRODUCT_REPORT_MODULE)

    await service.updateProductReports({
      id: compensationData.id,
      status: compensationData.previous_status,
    })
  }
)
