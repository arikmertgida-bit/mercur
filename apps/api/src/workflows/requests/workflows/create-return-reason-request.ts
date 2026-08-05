import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createReturnReasonsWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"
import { upsertCustomFieldsStep } from "@mercurjs/core/workflows"

import { RequestStatus } from "../../../types/requests"

type CreateReturnReasonRequestWorkflowInput = {
  return_reason: {
    value: string
    label: string
    description?: string
  }
  submitter_id: string
}

export const createReturnReasonRequestWorkflow = createWorkflow(
  "create-return-reason-request",
  function (input: CreateReturnReasonRequestWorkflowInput) {
    const returnReasons = createReturnReasonsWorkflow.runAsStep({
      input: {
        data: [input.return_reason],
      },
    })

    const { returnReason, upsertInput } = transform(
      { returnReasons, input },
      (data) => {
        const returnReason = data.returnReasons[0]
        if (!returnReason) {
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            "Failed to create return reason"
          )
        }
        return {
          returnReason,
          upsertInput: {
            alias: "return_reason",
            data: {
              id: returnReason.id,
              request_status: RequestStatus.PENDING,
              submitter_id: data.input.submitter_id,
            },
          },
        }
      }
    )

    upsertCustomFieldsStep(upsertInput)

    return new WorkflowResponse(returnReason)
  }
)
