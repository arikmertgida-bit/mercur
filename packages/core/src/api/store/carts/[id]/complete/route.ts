import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { completeCartWithSplitOrdersWorkflow } from "../../../../../workflows/cart"
import { defaultStoreCartFields, refetchCart } from "../../helpers"
import { StoreCompleteCartParamsType } from "./validators"

export const POST = async (
    req: MedusaRequest<{}, StoreCompleteCartParamsType>,
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
