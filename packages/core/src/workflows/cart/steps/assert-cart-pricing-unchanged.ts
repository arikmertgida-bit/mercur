import type { BigNumberInput } from "@medusajs/framework/types"
import {
    ContainerRegistrationKeys,
    MathBN,
    MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CART_PRICES_CHANGED_ERROR_CODE } from "@mercurjs/types"
import { z } from "zod"

import { GraphBigNumberSchema } from "../../../utils/graph-rows"

export { CART_PRICES_CHANGED_ERROR_CODE }

const StoredAdjustmentSchema = z.object({
    code: z.string().nullish(),
    amount: GraphBigNumberSchema,
    raw_amount: GraphBigNumberSchema.nullish(),
})

export const PricingCartRowSchema = z.object({
    id: z.string(),
    items: z
        .array(
            z.object({
                id: z.string(),
                unit_price: GraphBigNumberSchema,
                raw_unit_price: GraphBigNumberSchema.nullish(),
                is_custom_price: z.boolean().nullish(),
                adjustments: z.array(StoredAdjustmentSchema).nullish(),
            })
        )
        .nullish(),
    shipping_methods: z
        .array(
            z.object({
                id: z.string(),
                adjustments: z.array(StoredAdjustmentSchema).nullish(),
            })
        )
        .nullish(),
    promotions: z
        .array(z.object({ id: z.string(), code: z.string().nullish() }))
        .nullish(),
})

export type PricingCartRow = z.infer<typeof PricingCartRowSchema>

type ComputedAdjustment = { code: string; amount: BigNumberInput }

export type AssertCartPricingUnchangedStepInput = {
    cart: PricingCartRow
    /**
     * What the catalog prices each line at now, keyed by line item id;
     * `null` when the variant no longer has a price at all.
     */
    currentUnitPrices: Record<string, BigNumberInput | null>
    lineItemAdjustments: (ComputedAdjustment & { item_id: string })[]
    shippingMethodAdjustments: (ComputedAdjustment & { shipping_method_id: string })[]
}

type AdjustmentTotals = Map<string, BigNumberInput>

const addTo = (totals: AdjustmentTotals, key: string, amount: BigNumberInput): void => {
    const previous = totals.get(key)
    totals.set(key, previous === undefined ? amount : MathBN.add(previous, amount))
}

const sameTotals = (a: AdjustmentTotals, b: AdjustmentTotals): boolean =>
    a.size === b.size &&
    Array.from(a.entries()).every(([key, amount]) => {
        const other = b.get(key)
        return other !== undefined && MathBN.eq(amount, other)
    })

const adjustmentKey = (ownerId: string, code: string | null | undefined): string =>
    `${ownerId}\u0000${code ?? ""}`

/**
 * Compares the cart as stored with the cart as it would be priced right now.
 * A line's price is only compared when it came from the catalog — a custom
 * price was set on purpose and is never recalculated by a cart refresh either.
 */
export const describeCartPricingDrift = (
    input: AssertCartPricingUnchangedStepInput
): string[] => {
    const { cart } = input
    const drift: string[] = []

    const storedItemAdjustments: AdjustmentTotals = new Map()
    for (const item of cart.items ?? []) {
        const current = input.currentUnitPrices[item.id]
        if (
            !item.is_custom_price &&
            current !== undefined &&
            (current === null || !MathBN.eq(item.raw_unit_price ?? item.unit_price, current))
        ) {
            drift.push(`unit price of line item ${item.id}`)
        }
        for (const adjustment of item.adjustments ?? []) {
            addTo(
                storedItemAdjustments,
                adjustmentKey(item.id, adjustment.code),
                adjustment.raw_amount ?? adjustment.amount
            )
        }
    }

    const computedItemAdjustments: AdjustmentTotals = new Map()
    for (const adjustment of input.lineItemAdjustments) {
        addTo(computedItemAdjustments, adjustmentKey(adjustment.item_id, adjustment.code), adjustment.amount)
    }
    if (!sameTotals(storedItemAdjustments, computedItemAdjustments)) {
        drift.push("line item discounts")
    }

    const storedShippingAdjustments: AdjustmentTotals = new Map()
    for (const method of cart.shipping_methods ?? []) {
        for (const adjustment of method.adjustments ?? []) {
            addTo(
                storedShippingAdjustments,
                adjustmentKey(method.id, adjustment.code),
                adjustment.raw_amount ?? adjustment.amount
            )
        }
    }
    const computedShippingAdjustments: AdjustmentTotals = new Map()
    for (const adjustment of input.shippingMethodAdjustments) {
        addTo(
            computedShippingAdjustments,
            adjustmentKey(adjustment.shipping_method_id, adjustment.code),
            adjustment.amount
        )
    }
    if (!sameTotals(storedShippingAdjustments, computedShippingAdjustments)) {
        drift.push("shipping discounts")
    }

    return drift
}

/**
 * Stops a completion whose cart was priced under conditions that no longer
 * hold — a campaign that ended or ran out of budget, a promotion that was
 * deactivated, a price the seller changed — before any order is created or
 * payment is authorized. Nothing is changed here: the caller refreshes the
 * cart so the shopper confirms the current amount and pays that.
 */
export const assertCartPricingUnchangedStep = createStep(
    "assert-cart-pricing-unchanged",
    async (input: AssertCartPricingUnchangedStepInput, { container }) => {
        const drift = describeCartPricingDrift(input)

        if (drift.length) {
            container
                .resolve(ContainerRegistrationKeys.LOGGER)
                .info(`Cart ${input.cart.id} completion stopped, pricing changed: ${drift.join(", ")}`)

            throw new MedusaError(
                MedusaError.Types.NOT_ALLOWED,
                "The prices in your cart have been updated. Please review your cart.",
                CART_PRICES_CHANGED_ERROR_CODE
            )
        }

        return new StepResponse(void 0)
    }
)
