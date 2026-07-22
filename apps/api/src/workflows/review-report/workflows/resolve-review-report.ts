import {
  WorkflowResponse,
  createWorkflow,
} from "@medusajs/framework/workflows-sdk"

import { resolveReviewReportStep } from "../steps/resolve-review-report"

type ResolveReviewReportInput = {
  report_id: string
  action: "delete" | "reject"
  admin_note: string
}

export const resolveReviewReportWorkflow = createWorkflow(
  {
    name: "resolve-review-report",
  },
  function (input: ResolveReviewReportInput) {
    const result = resolveReviewReportStep(input)
    return new WorkflowResponse(result)
  }
)
