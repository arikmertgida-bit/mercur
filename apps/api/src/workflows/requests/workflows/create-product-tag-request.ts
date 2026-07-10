import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createProductTagsWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"
import { upsertCustomFieldsStep } from "@mercurjs/core/workflows"

import { RequestStatus } from "../../../types/requests"

type CreateProductTagRequestWorkflowInput = {
  product_tag: {
    value: string
    metadata?: Record<string, unknown>
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

    const { productTag, upsertInput } = transform(
      { productTags, input },
      (data) => {
        const productTag = data.productTags[0]
        if (!productTag) {
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            "Failed to create product tag"
          )
        }
        return {
          productTag,
          upsertInput: {
            alias: "product_tag",
            data: {
              id: productTag.id,
              request_status: RequestStatus.PENDING,
              submitter_id: data.input.submitter_id,
            },
          },
        }
      }
    )

    upsertCustomFieldsStep(upsertInput)

    return new WorkflowResponse(productTag)
  }
)
