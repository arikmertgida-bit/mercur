import { Modules } from "@medusajs/framework/utils"
import type { LinkDefinition } from "@medusajs/framework/types"
import {
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { dismissRemoteLinkStep } from "@medusajs/medusa/core-flows"

import { SELLER_FOLLOW_MODULE } from "../../../modules/seller-follow"
import { deleteFollowStep } from "../steps/delete-follow"

const SELLER_MODULE = "seller"

export type UnfollowSellerWorkflowInput = {
  id: string
  customer_id: string
  seller_id: string
}

export const unfollowSellerWorkflow = createWorkflow(
  {
    name: "unfollow-seller",
  },
  function (input: UnfollowSellerWorkflowInput) {
    const links = transform({ input }, ({ input }): LinkDefinition[] => [
      {
        [Modules.CUSTOMER]: {
          customer_id: input.customer_id,
        },
        [SELLER_FOLLOW_MODULE]: {
          seller_follower_id: input.id,
        },
      },
      {
        [SELLER_MODULE]: {
          seller_id: input.seller_id,
        },
        [SELLER_FOLLOW_MODULE]: {
          seller_follower_id: input.id,
        },
      },
    ])

    dismissRemoteLinkStep(links)
    deleteFollowStep({ id: input.id })

    return new WorkflowResponse(input)
  }
)
