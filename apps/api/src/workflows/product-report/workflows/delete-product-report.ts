import {
  WorkflowResponse,
  createWorkflow,
} from "@medusajs/framework/workflows-sdk"

import { deleteProductReportStep } from "../steps/delete-product-report"

type DeleteProductReportInput = {
  id: string
}

export const deleteProductReportWorkflow = createWorkflow(
  {
    name: "delete-product-report",
  },
  function (input: DeleteProductReportInput) {
    const result = deleteProductReportStep(input)
    return new WorkflowResponse(result)
  }
)
