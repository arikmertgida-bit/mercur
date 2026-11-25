import { updateCartPromotionsWorkflow } from "@medusajs/core-flows"
import { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { loadSellerPromotionScope } from "@mercurjs/core/workflows"

// Every cart refresh (line items, address, shipping) recomputes promotions
// through this workflow. The scope keeps a seller's promotion on that seller's
// lines inside the promotion module (see the @medusajs/promotion patch in
// @mercurjs/core); Mercur's own promo-code route adds the same scope itself.
updateCartPromotionsWorkflow.hooks.setPromotionContext(
  async ({ cart, promo_codes }, { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    return new StepResponse(await loadSellerPromotionScope(query, cart, promo_codes))
  }
)
