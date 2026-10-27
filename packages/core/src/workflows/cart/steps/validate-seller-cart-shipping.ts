import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
    CompleteCartRow,
    getLineItemSellerId,
    SellerShippingOptionRow,
} from "../utils"

type ValidateSellerCartShippingStepInput = {
    cart: Pick<CompleteCartRow, "items" | "shipping_methods">
    shippingOptions: SellerShippingOptionRow[]
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

        const itemsRequiringShipping = (cart.items ?? []).filter(
            (item) => item.requires_shipping
        )
        const shippingMethods = cart.shipping_methods ?? []

        if (itemsRequiringShipping.length > 0 && shippingMethods.length === 0) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "No shipping method selected but the cart contains items that require shipping."
            )
        }

        const optionProfileMap = new Map<string, string>(
            shippingOptions.map((so) => [so.id, so.shipping_profile_id])
        )
        const availableProfiles = new Set(
            shippingMethods.map((method) =>
                method.shipping_option_id
                    ? optionProfileMap.get(method.shipping_option_id)
                    : undefined
            )
        )

        // The product, not the variant, owns the shipping profile a seller
        // ships from — fetched via `items.variant.product.shipping_profile.id`
        // (see `completeCartFields`).
        const missingProfiles = itemsRequiringShipping
            .map((item) => item.variant?.product?.shipping_profile?.id ?? undefined)
            .filter((profileId) => !availableProfiles.has(profileId))

        if (missingProfiles.length > 0) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "The cart items require shipping profiles that are not satisfied by the current shipping methods"
            )
        }

        return new StepResponse(void 0)
    }
)
