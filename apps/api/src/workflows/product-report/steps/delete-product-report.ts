import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import { PRODUCT_REPORT_MODULE } from "../../../modules/product-reports"
import ProductReportService from "../../../modules/product-reports/service"

type DeleteProductReportInput = {
  id: string
}

export const deleteProductReportStep = createStep(
  "delete-product-report",
  async (input: DeleteProductReportInput, { container }) => {
    const service = container.resolve<ProductReportService>(PRODUCT_REPORT_MODULE)

    await service.deleteProductReports(input.id)

    return new StepResponse({ success: true, deleted: true }, input.id)
  },
  async (id: string | undefined, { container }) => {
    if (!id) {
      return
    }

    const service = container.resolve<ProductReportService>(PRODUCT_REPORT_MODULE)
    await service.restoreProductReports(id)
  }
)
