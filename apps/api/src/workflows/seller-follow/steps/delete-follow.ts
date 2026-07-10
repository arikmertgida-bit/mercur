import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import {
  SELLER_FOLLOW_MODULE,
  SellerFollowerModuleService,
} from "../../../modules/seller-follow"

export type DeleteFollowStepInput = {
  id: string
}

export const deleteFollowStep = createStep(
  "delete-seller-follow",
  async (input: DeleteFollowStepInput, { container }) => {
    const service = container.resolve<SellerFollowerModuleService>(
      SELLER_FOLLOW_MODULE
    )
    await service.deleteSellerFollowers(input.id)

    return new StepResponse(input, input)
  },
  async (compensateInput, { container }) => {
    if (!compensateInput) {
      return
    }
    const service = container.resolve<SellerFollowerModuleService>(
      SELLER_FOLLOW_MODULE
    )
    await service.createSellerFollowers({ id: compensateInput.id })
  }
)
