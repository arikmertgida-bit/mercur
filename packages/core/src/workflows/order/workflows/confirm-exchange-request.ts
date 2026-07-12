import { OrderPreviewDTO } from "@medusajs/framework/types"
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { confirmExchangeRequestWorkflow as baseConfirmExchangeRequestWorkflow } from "@medusajs/medusa/core-flows"

export type ConfirmExchangeRequestWorkflowInput = {
  exchange_id: string
  confirmed_by?: string
}

export const confirmExchangeRequestWorkflowId =
  "mercur-confirm-exchange-request"

export const confirmExchangeRequestWorkflow = createWorkflow(
  confirmExchangeRequestWorkflowId,
  function (
    input: ConfirmExchangeRequestWorkflowInput
  ): WorkflowResponse<OrderPreviewDTO> {
    const orderPreview = baseConfirmExchangeRequestWorkflow.runAsStep({
      input: {
        exchange_id: input.exchange_id,
        confirmed_by: input.confirmed_by,
      },
    })

    return new WorkflowResponse(orderPreview)
  }
)
