import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import {
  WISHLIST_MODULE,
  WishlistModuleService,
} from "../../../modules/wishlist"
import { getWishlistFromCustomerId } from "../../../modules/wishlist/utils"

export type FindOrCreateWishlistStepInput = {
  customer_id: string
  reference: "product"
}

export type FindOrCreateWishlistStepOutput = {
  id: string
  created: boolean
}

type FindOrCreateWishlistCompensateInput = {
  id: string
}

export const findOrCreateWishlistStep = createStep(
  "find-or-create-wishlist",
  async (
    input: FindOrCreateWishlistStepInput,
    { container }
  ): Promise<StepResponse<FindOrCreateWishlistStepOutput, FindOrCreateWishlistCompensateInput>> => {
    const existing = await getWishlistFromCustomerId(container, input.customer_id)

    if (existing) {
      return new StepResponse({ id: existing.id, created: false })
    }

    const service = container.resolve<WishlistModuleService>(WISHLIST_MODULE)
    const wishlist = await service.createWishlists({ reference: input.reference })

    return new StepResponse(
      { id: wishlist.id, created: true },
      { id: wishlist.id }
    )
  },
  async (compensateInput, { container }) => {
    if (!compensateInput) {
      return
    }
    const service = container.resolve<WishlistModuleService>(WISHLIST_MODULE)
    await service.deleteWishlists(compensateInput.id)
  }
)
