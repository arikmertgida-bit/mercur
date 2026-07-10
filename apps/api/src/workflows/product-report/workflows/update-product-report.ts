import {
  WorkflowResponse,
  createWorkflow,
} from "@medusajs/framework/workflows-sdk"

import { updateProductReportStep } from "../steps/update-product-report"

type UpdateProductReportInput = {
  id: string
  status: "pending" | "resolved" | "dismissed"
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
