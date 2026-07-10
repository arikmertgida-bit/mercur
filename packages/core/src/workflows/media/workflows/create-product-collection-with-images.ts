import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createCollectionsWorkflow } from "@medusajs/medusa/core-flows"

import type { CollectionMediaInput } from "./set-collection-images"
import { setCollectionImagesWorkflow } from "./set-collection-images"

export type CreateProductCollectionWithImagesWorkflowInput = {
  collection: Record<string, unknown>
  media?: CollectionMediaInput[]
  icon?: string | null
}

export const createProductCollectionWithImagesWorkflowId =
  "mercur-create-product-collection-with-images"

export const createProductCollectionWithImagesWorkflow = createWorkflow(
  createProductCollectionWithImagesWorkflowId,
  (input: CreateProductCollectionWithImagesWorkflowInput) => {
    const created = createCollectionsWorkflow.runAsStep({
      input: {
        // @ts-expect-error — `collection` is intentionally a caller-provided
        // `Record<string, unknown>` (arbitrary collection payload), so it can't
        // structurally match Medusa's concrete collection DTO at the type level.
        // Real third-party (Medusa) type boundary.
        collections: [input.collection],
      },
    })

    const collectionId = transform({ created }, ({ created }) => created[0].id)

    const imagesInput = transform(
      { collectionId, input },
      ({ collectionId, input }) => ({
        collection_id: collectionId,
        media: input.media,
        icon: input.icon,
      })
    )
    setCollectionImagesWorkflow.runAsStep({ input: imagesInput })

    return new WorkflowResponse(collectionId)
  }
)
