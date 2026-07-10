import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import { WISHLIST_MODULE, WishlistModuleService } from "../../../modules/wishlist"

export type DeleteWishlistRecordStepInput = {
  id: string
}

export const deleteWishlistRecordStep = createStep(
  "delete-wishlist-record",
  async (input: DeleteWishlistRecordStepInput, { container }) => {
    const service = container.resolve<WishlistModuleService>(WISHLIST_MODULE)
    await service.softDeleteWishlists(input.id)

    return new StepResponse({ id: input.id }, input.id)
  },
  async (wishlistId, { container }) => {
    if (!wishlistId) {
      return
    }
    const service = container.resolve<WishlistModuleService>(WISHLIST_MODULE)
    await service.restoreWishlists(wishlistId)
  }
)
