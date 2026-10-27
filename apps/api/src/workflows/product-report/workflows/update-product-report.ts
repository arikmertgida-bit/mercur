import {
  WorkflowResponse,
  createWorkflow,
} from "@medusajs/framework/workflows-sdk"

import { updateProductReportStep } from "../steps/update-product-report"
import { ProductReportStatus } from "../../../modules/product-reports/constants"

type UpdateProductReportInput = {
  id: string
  status: ProductReportStatus
}

export const updateProductReportWorkflow = createWorkflow(
  {
    name: "update-product-report",
  },
  function (input: UpdateProductReportInput) {
    const result = updateProductReportStep(input)
    return new WorkflowResponse(result)
  }
)
