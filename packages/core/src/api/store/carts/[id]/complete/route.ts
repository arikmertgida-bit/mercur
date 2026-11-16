import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { refreshCartItemsWorkflow } from "@medusajs/medusa/core-flows"
import { HttpTypes } from "@mercurjs/types"
import { z } from "zod"

import {
    CART_PRICES_CHANGED_ERROR_CODE,
    completeCartWithSplitOrdersWorkflow,
} from "../../../../../workflows/cart"
import { defaultStoreCartFields, refetchCart } from "../../helpers"
import { StoreCompleteCartParamsType } from "./validators"

// Workflow errors arrive serialized; the MedusaError code survives.
const PricesChangedErrorSchema = z.object({
    code: z.literal(CART_PRICES_CHANGED_ERROR_CODE),
})

export const POST = async (
    req: MedusaRequest<never, StoreCompleteCartParamsType>,
    res: MedusaResponse<HttpTypes.StoreCompleteCartResponse>
) => {
    const cart_id = req.params.id

    const { errors, result } = await completeCartWithSplitOrdersWorkflow(req.scope).run({
        input: { cart_id },
        throwOnError: false,
    })

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    if (errors?.[0]) {
        const error = errors[0].error

        // The completion stopped before any order or payment because the
        // cart's prices are stale. Re-price it now so the shopper's next look
        // at the cart, and the payment collection, show the current amount.
        if (PricesChangedErrorSchema.safeParse(error).success) {
            try {
                await refreshCartItemsWorkflow(req.scope).run({
                    input: { cart_id, force_refresh: true },
                })
            } catch (refreshError) {
                const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
                logger.error(
                    `Refreshing cart ${cart_id} after a price change failed: ${
                        refreshError instanceof Error ? refreshError.message : String(refreshError)
                    }`
                )
            }
            throw error
        }

        const statusOKErrors: string[] = [
            MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
            MedusaError.Types.PAYMENT_REQUIRES_MORE_ERROR,
        ]

        const cart = await refetchCart(
            cart_id,
            req.scope,
            defaultStoreCartFields
        )

        if (!statusOKErrors.includes(error?.type)) {
            // The PostgreSQL-level second oversell defense
            // (trg_enforce_reservation_limit, see the inventory-integrity-
            // guard module) surfaces as a raw driver error, not a
            // MedusaError — only reached if the app-level Redis lock around
            // reserveInventoryStep somehow still let two reservations race.
            // Translate it to the exact same error type/shape the normal
            // `ensureInventoryLevels` oversell check already throws, so
            // every existing downstream error-translation/i18n path handles
            // it identically without a new surface.
            const rawMessage = error instanceof Error ? error.message : String(error)
            if (rawMessage.includes("INVENTORY_OVERSELL_BLOCKED")) {
                throw new MedusaError(
                    MedusaError.Types.NOT_ALLOWED,
                    "Not enough stock available for one or more items in this cart."
                )
            }
            throw error
        }

        res.status(200).json({
            type: "cart",
            cart,
            error: {
                message: error.message,
                name: error.name,
                type: error.type,
            },
        })
        return
    }

    const { data: orderGroups } = await query.graph({
        entity: "order_group",
        fields: req.queryConfig.fields,
        filters: { id: result.order_group_id },
    })

    res.status(200).json({
        type: "order_group",
        order_group: orderGroups[0],
    })
}
