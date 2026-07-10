import { Modules } from "@medusajs/framework/utils"
import type { LinkDefinition } from "@medusajs/framework/types"
import {
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"

import { SELLER_FOLLOW_MODULE } from "../../../modules/seller-follow"
import { findOrCreateFollowStep } from "../steps/find-or-create-follow"

const SELLER_MODULE = "seller"

export type FollowSellerWorkflowInput = {
  customer_id: string
  seller_id: string
}

export const followSellerWorkflow = createWorkflow(
  {
    name: "follow-seller",
  },
  function (input: FollowSellerWorkflowInput) {
    const follow = findOrCreateFollowStep({
      customer_id: input.customer_id,
      seller_id: input.seller_id,
    })

    const links = transform({ input, follow }, ({ input, follow }): LinkDefinition[] => {
      if (!follow.created) {
        return []
      }

      return [
        {
          [Modules.CUSTOMER]: {
            customer_id: input.customer_id,
          },
          [SELLER_FOLLOW_MODULE]: {
            seller_follower_id: follow.id,
          },
        },
        {
          [SELLER_MODULE]: {
            seller_id: input.seller_id,
          },
          [SELLER_FOLLOW_MODULE]: {
            seller_follower_id: follow.id,
          },
        },
      ]
    })

    createRemoteLinkStep(links)

    return new WorkflowResponse(follow)
  }
)
