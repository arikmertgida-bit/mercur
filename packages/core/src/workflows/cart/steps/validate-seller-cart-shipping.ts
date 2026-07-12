import {
    CartLineItemDTO,
    CartWorkflowDTO,
    ShippingOptionDTO,
} from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SellerDTO } from "@mercurjs/types"
import { CartLineItemWithSeller, getLineItemSellerId } from "../utils"

type ValidateSellerCartShippingStepInput = {
    cart: Omit<CartWorkflowDTO, "items"> & {
        items: (CartLineItemDTO & Pick<CartLineItemWithSeller, "variant">)[]
    }
    shippingOptions: ShippingOptionDTO & {
        seller: SellerDTO
    }[]
}

export const validateSellerCartShippingStep = createStep(
    "validate-seller-shipping",
    (input: ValidateSellerCartShippingStepInput) => {
        const { cart, shippingOptions } = input
        const sellersWithShippingOptions = new Set<string>(
            shippingOptions.map((so) => so.seller.id)
        )

        const itemsWithMissingShippingOptions = (cart.items ?? []).filter(
            (item) => {
                const sellerId = getLineItemSellerId(item)
                return (
                    item.requires_shipping &&
                    (!sellerId || !sellersWithShippingOptions.has(sellerId))
                )
            }
        )

        if (itemsWithMissingShippingOptions.length > 0) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "No shipping method selected but the cart contains seller items that require shipping."
            )
        }

        return new StepResponse(void 0)
    }
)
