import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createCollectionsWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"
import { upsertCustomFieldsStep } from "@mercurjs/core/workflows"

import { RequestStatus } from "../../../types/requests"

type CreateProductCollectionRequestWorkflowInput = {
  product_collection: {
    title: string
    handle?: string
    metadata?: Record<string, unknown>
  }
  submitter_id: string
}

export const createProductCollectionRequestWorkflow = createWorkflow(
  "create-product-collection-request",
  function (input: CreateProductCollectionRequestWorkflowInput) {
    const collections = createCollectionsWorkflow.runAsStep({
      input: {
        collections: [input.product_collection],
      },
    })

    const { collection, upsertInput } = transform(
      { collections, input },
      (data) => {
        const collection = data.collections[0]
        if (!collection) {
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            "Failed to create product collection"
          )
        }
        return {
          collection,
          upsertInput: {
            alias: "product_collection",
            data: {
              id: collection.id,
              request_status: RequestStatus.PENDING,
              submitter_id: data.input.submitter_id,
            },
          },
        }
      }
    )

    upsertCustomFieldsStep(upsertInput)

    return new WorkflowResponse(collection)
  }
)
