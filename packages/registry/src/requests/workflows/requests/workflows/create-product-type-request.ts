import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createProductTypesWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"
import { upsertCustomFieldsStep } from "@mercurjs/core/workflows"
import type { JsonRecord } from "@mercurjs/types"

import { RequestStatus } from "../../../types"

type CreateProductTypeRequestWorkflowInput = {
  product_type: {
    value: string
    metadata?: JsonRecord
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

    const productType = transform({ productTypes }, (data) => {
      const created = data.productTypes[0]
      if (!created) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Failed to create product type"
        )
      }
      return created
    })

    const upsertInput = transform({ productType, input }, (data) => ({
      alias: "product_type",
      data: {
        id: data.productType.id,
        request_status: RequestStatus.PENDING,
        submitter_id: data.input.submitter_id,
      },
    }))

    upsertCustomFieldsStep(upsertInput)

    return new WorkflowResponse(productType)
  }
)
