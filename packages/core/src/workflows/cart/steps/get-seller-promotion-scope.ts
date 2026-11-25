import { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import {
    loadSellerPromotionScope,
    SellerPromotionScopeContext,
} from "../utils/seller-promotion-scope"

export type GetSellerPromotionScopeStepInput = {
    cart: Parameters<typeof loadSellerPromotionScope>[1]
    promo_codes: string[]
}

export const getSellerPromotionScopeStep = createStep(
    "get-seller-promotion-scope",
    async (data: GetSellerPromotionScopeStepInput, { container }) => {
        const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
        const scope: SellerPromotionScopeContext = await loadSellerPromotionScope(
            query,
            data.cart,
            data.promo_codes
        )

        return new StepResponse(scope)
    }
)
