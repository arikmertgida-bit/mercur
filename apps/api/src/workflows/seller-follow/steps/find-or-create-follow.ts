import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import {
  SELLER_FOLLOW_MODULE,
  SellerFollowerModuleService,
} from "../../../modules/seller-follow"
import { findSellerFollow } from "../../../modules/seller-follow/utils"

export type FindOrCreateFollowStepInput = {
  customer_id: string
  seller_id: string
}

export type FindOrCreateFollowStepOutput = {
  id: string
  created: boolean
}

type FindOrCreateFollowCompensateInput = {
  id: string
}

export const findOrCreateFollowStep = createStep(
  "find-or-create-seller-follow",
  async (
    input: FindOrCreateFollowStepInput,
    { container }
  ): Promise<
    StepResponse<FindOrCreateFollowStepOutput, FindOrCreateFollowCompensateInput>
  > => {
    const existing = await findSellerFollow(
      container,
      input.customer_id,
      input.seller_id
    )

    if (existing) {
      return new StepResponse({ id: existing.id, created: false })
    }

    const service = container.resolve<SellerFollowerModuleService>(
      SELLER_FOLLOW_MODULE
    )
    const follow = await service.createSellerFollowers({})

    return new StepResponse(
      { id: follow.id, created: true },
      { id: follow.id }
    )
  },
  async (compensateInput, { container }) => {
    if (!compensateInput) {
      return
    }
    const service = container.resolve<SellerFollowerModuleService>(
      SELLER_FOLLOW_MODULE
    )
    await service.deleteSellerFollowers(compensateInput.id)
  }
)
