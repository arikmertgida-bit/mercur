import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createProductTypesWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"
import { upsertCustomFieldsStep } from "@mercurjs/core/workflows"

import { RequestStatus } from "../../../types/requests"

type CreateProductTypeRequestWorkflowInput = {
  product_type: {
    value: string
    metadata?: Record<string, unknown>
  }
  submitter_id: string
}

export const createProductTypeRequestWorkflow = createWorkflow(
  "create-product-type-request",
  function (input: CreateProductTypeRequestWorkflowInput) {
    const productTypes = createProductTypesWorkflow.runAsStep({
      input: {
        product_types: [input.product_type],
      },
    })

    const { productType, upsertInput } = transform(
      { productTypes, input },
      (data) => {
        const productType = data.productTypes[0]
        if (!productType) {
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            "Failed to create product type"
          )
        }
        return {
          productType,
          upsertInput: {
            alias: "product_type",
            data: {
              id: productType.id,
              request_status: RequestStatus.PENDING,
              submitter_id: data.input.submitter_id,
            },
          },
        }
      }
    )

    upsertCustomFieldsStep(upsertInput)

    return new WorkflowResponse(productType)
  }
)
