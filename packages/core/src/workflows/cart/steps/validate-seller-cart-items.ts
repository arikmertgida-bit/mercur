import { CartLineItemDTO, CartWorkflowDTO } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Logger } from "@medusajs/medusa"
import { CartLineItemWithSeller, getLineItemSellerId } from "../utils"

type ValidateSellerCartItemsStepInput = {
    cart: Omit<CartWorkflowDTO, "items"> & {
        items: (CartLineItemDTO & Pick<CartLineItemWithSeller, "variant">)[]
    }
}

export const validateSellerCartItemsStep = createStep(
    "validate-seller-cart-items",
    (input: ValidateSellerCartItemsStepInput, { container }) => {
        const logger: Logger = container.resolve(ContainerRegistrationKeys.LOGGER)

        const itemsWithMissingSellers = (input.cart.items ?? []).filter(
            (item) => {
                return !getLineItemSellerId(item)
            }
        )

        if (itemsWithMissingSellers.length > 0) {
            logger.warn(
                `The cart items required to be assigned to a seller but some of them are missing: ${itemsWithMissingSellers
                    .map((item) => item.id)
                    .join(", ")}`
            )

            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                `The cart items required to be assigned to a seller but some of them are missing`
            )
        }

        return new StepResponse(void 0)
    }
)
