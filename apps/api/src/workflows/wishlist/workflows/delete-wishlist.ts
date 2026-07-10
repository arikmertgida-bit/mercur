import { Modules } from "@medusajs/framework/utils"
import {
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { dismissRemoteLinkStep } from "@medusajs/medusa/core-flows"

import { DeleteWishlistDTO, WISHLIST_MODULE } from "../../../modules/wishlist"

export const deleteWishlistEntryWorkflow = createWorkflow(
  {
    name: "delete-wishlist",
  },
  function (input: DeleteWishlistDTO) {
    const links = transform({ input }, ({ input }) => [
      {
        [WISHLIST_MODULE]: {
          wishlist_id: input.id,
        },
        [Modules.PRODUCT]: {
          product_id: input.reference_id,
        },
      },
    ])

    dismissRemoteLinkStep(links)

    return new WorkflowResponse(input)
  }
)
