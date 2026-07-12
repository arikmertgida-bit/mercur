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
    shippingOptions: (ShippingOptionDTO & {
        seller: SellerDTO
    })[]
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

        const optionProfileMap = new Map(
            shippingOptions.map((so) => [so.id, so.shipping_profile_id])
        )
        const availableProfiles = new Set(
            shippingMethods.map((method) =>
                optionProfileMap.get(method.shipping_option_id as string)
            )
        )

        // The product, not the variant, owns the shipping profile a seller
        // ships from — fetched via `items.variant.product.shipping_profile.id`
        // (see `completeCartFields`), a relation the base `ProductDTO` type
        // doesn't declare.
        const missingProfiles = itemsRequiringShipping
            .map((item) => {
                const product = item.variant?.product as
                    | { shipping_profile?: { id: string } | null }
                    | undefined
                return product?.shipping_profile?.id ?? undefined
            })
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
