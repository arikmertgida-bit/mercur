import { OrderPreviewDTO } from "@medusajs/framework/types"
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { confirmOrderEditRequestWorkflow as baseConfirmOrderEditRequestWorkflow } from "@medusajs/medusa/core-flows"

export type ConfirmOrderEditRequestWorkflowInput = {
  order_id: string
  confirmed_by?: string
}

export const confirmOrderEditRequestWorkflowId =
  "mercur-confirm-order-edit-request"

export const confirmOrderEditRequestWorkflow = createWorkflow(
  confirmOrderEditRequestWorkflowId,
  function (
    input: ConfirmOrderEditRequestWorkflowInput
  ): WorkflowResponse<OrderPreviewDTO> {
    const orderPreview = baseConfirmOrderEditRequestWorkflow.runAsStep({
      input: {
        order_id: input.order_id,
        confirmed_by: input.confirmed_by,
      },
    })

    return new WorkflowResponse(orderPreview)
  }
)
