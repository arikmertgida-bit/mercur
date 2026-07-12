import { OrderPreviewDTO } from "@medusajs/framework/types"
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { confirmClaimRequestWorkflow as baseConfirmClaimRequestWorkflow } from "@medusajs/medusa/core-flows"

export type ConfirmClaimRequestWorkflowInput = {
  claim_id: string
  confirmed_by?: string
}

export const confirmClaimRequestWorkflowId =
  "mercur-confirm-claim-request"

export const confirmClaimRequestWorkflow = createWorkflow(
  confirmClaimRequestWorkflowId,
  function (
    input: ConfirmClaimRequestWorkflowInput
  ): WorkflowResponse<OrderPreviewDTO> {
    const orderPreview = baseConfirmClaimRequestWorkflow.runAsStep({
      input: {
        claim_id: input.claim_id,
        confirmed_by: input.confirmed_by,
      },
    })

    return new WorkflowResponse(orderPreview)
  }
)
