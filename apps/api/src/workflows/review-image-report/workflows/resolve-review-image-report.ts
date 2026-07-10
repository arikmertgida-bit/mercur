import {
  WorkflowResponse,
  createWorkflow,
} from "@medusajs/framework/workflows-sdk"

import { resolveReviewImageReportStep } from "../steps/resolve-review-image-report"

type ResolveReviewImageReportInput = {
  report_id: string
  image_id: string
  action: "hide" | "publish"
}

export const resolveReviewImageReportWorkflow = createWorkflow(
  {
    name: "resolve-review-image-report",
  },
  function (input: ResolveReviewImageReportInput) {
    const result = resolveReviewImageReportStep(input)
    return new WorkflowResponse(result)
  }
)
