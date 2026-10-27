import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createCollectionsWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"
import { upsertCustomFieldsStep } from "@mercurjs/core/workflows"
import type { JsonRecord } from "@mercurjs/types"

import { RequestStatus } from "../../../types"

type CreateProductCollectionRequestWorkflowInput = {
  product_collection: {
    title: string
    handle?: string
    metadata?: JsonRecord
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

    const collection = transform({ collections }, (data) => {
      const created = data.collections[0]
      if (!created) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Failed to create product collection"
        )
      }
      return created
    })

    const upsertInput = transform({ collection, input }, (data) => ({
      alias: "product_collection",
      data: {
        id: data.collection.id,
        request_status: RequestStatus.PENDING,
        submitter_id: data.input.submitter_id,
      },
    }))

    upsertCustomFieldsStep(upsertInput)

    return new WorkflowResponse(collection)
  }
)
