import {
  createWorkflow,
  transform,
  when,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { UpdateProductVariantWorkflowInputDTO } from "@medusajs/framework/types"
import { batchProductVariantsWorkflow } from "@medusajs/medusa/core-flows"

import {
  createSellerProductVariantWorkflow,
  SellerProductVariantInput,
} from "./create-seller-product-variant"

export type BatchSellerProductVariantsWorkflowInput = {
  seller_id: string
  create: SellerProductVariantInput[]
  update: (UpdateProductVariantWorkflowInputDTO & { id: string })[]
  delete: string[]
}

export type BatchSellerProductVariantsWorkflowOutput = {
  created: string[]
  updated: string[]
  deleted: string[]
}

export const batchSellerProductVariantsWorkflowId =
  "mercur-batch-seller-product-variants"

/**
 * Medusa's variant batch with the seller rules of the single-variant route:
 * created variants go through `createSellerProductVariantWorkflow` (always
 * stock-tracked, inventory item owned by the product's seller); updates and
 * deletes run Medusa's batch as is.
 */
export const batchSellerProductVariantsWorkflow = createWorkflow(
  batchSellerProductVariantsWorkflowId,
  (
    input: WorkflowData<BatchSellerProductVariantsWorkflowInput>
  ): WorkflowResponse<BatchSellerProductVariantsWorkflowOutput> => {
    const created = when(
      { input },
      ({ input }) => input.create.length > 0
    ).then(() =>
      createSellerProductVariantWorkflow.runAsStep({
        input: transform({ input }, ({ input }) => ({
          seller_id: input.seller_id,
          variants: input.create,
        })),
      })
    )

    const batched = when(
      { input },
      ({ input }) => input.update.length > 0 || input.delete.length > 0
    ).then(() =>
      batchProductVariantsWorkflow.runAsStep({
        input: transform({ input }, ({ input }) => ({
          update: input.update,
          delete: input.delete,
        })),
      })
    )

    return new WorkflowResponse(
      transform({ created, batched }, ({ created, batched }) => ({
        created: created?.ids ?? [],
        updated: (batched?.updated ?? []).map((variant) => variant.id),
        deleted: batched?.deleted ?? [],
      }))
    )
  }
)
