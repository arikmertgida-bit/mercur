import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createProductTagsWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"
import { upsertCustomFieldsStep } from "@mercurjs/core/workflows"
import type { JsonRecord } from "@mercurjs/types"

import { RequestStatus } from "../../../types"

type CreateProductTagRequestWorkflowInput = {
  product_tag: {
    value: string
    metadata?: JsonRecord
  }
  submitter_id: string
}

export const createProductTagRequestWorkflow = createWorkflow(
  "create-product-tag-request",
  function (input: CreateProductTagRequestWorkflowInput) {
    const productTags = createProductTagsWorkflow.runAsStep({
      input: {
        product_tags: [input.product_tag],
      },
    })

    const productTag = transform({ productTags }, (data) => {
      const created = data.productTags[0]
      if (!created) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Failed to create product tag"
        )
      }
      return created
    })

    const upsertInput = transform({ productTag, input }, (data) => ({
      alias: "product_tag",
      data: {
        id: data.productTag.id,
        request_status: RequestStatus.PENDING,
        submitter_id: data.input.submitter_id,
      },
    }))

    upsertCustomFieldsStep(upsertInput)

    return new WorkflowResponse(productTag)
  }
)
