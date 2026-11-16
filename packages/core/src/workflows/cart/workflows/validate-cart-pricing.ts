import type { BigNumberInput } from "@medusajs/framework/types"
import {
    createWorkflow,
    transform,
    WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
    getActionsToComputeFromPromotionsStep,
    getVariantPriceSetsStep,
    prepareAdjustmentsFromPromotionActionsStep,
    useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import { z } from "zod"

import { GraphBigNumberSchema, parseGraphRow } from "../../../utils/graph-rows"
import { assertCartPricingUnchangedStep, PricingCartRowSchema } from "../steps"
import { cartFieldsForRefreshSteps } from "../utils"

export type ValidateCartPricingWorkflowInput = {
    cart_id: string
}

const NullableText = z.string().nullish()

// The cart columns Medusa's `getVariantsAndItemsWithPrices` puts into the
// pricing context (`cartFieldsForPricingContext` plus region and customer).
const PricingContextCartSchema = z.object({
    id: z.string(),
    sales_channel_id: NullableText,
    currency_code: z.string(),
    region_id: NullableText,
    locale: NullableText,
    email: NullableText,
    item_total: GraphBigNumberSchema.nullish(),
    total: GraphBigNumberSchema.nullish(),
    shipping_address: z
        .object({
            city: NullableText,
            country_code: NullableText,
            province: NullableText,
            postal_code: NullableText,
        })
        .nullish(),
    region: z.object({ id: z.string(), currency_code: NullableText }).nullish(),
    customer_id: NullableText,
    customer: z
        .object({
            id: z.string(),
            groups: z.array(z.object({ id: z.string() })).nullish(),
        })
        .nullish(),
    items: z
        .array(
            z.object({
                id: z.string(),
                variant_id: NullableText,
                quantity: GraphBigNumberSchema,
                unit_price: GraphBigNumberSchema.nullish(),
            })
        )
        .nullish(),
})

const CalculatedPriceSetsSchema = z.record(
    z.string(),
    z.object({ calculated_amount: GraphBigNumberSchema.nullish() })
)

/**
 * Re-prices the cart and re-runs its promotions at the current time — the
 * computations a cart refresh performs — and fails if the result differs from
 * what the cart holds. Read-only: every step used here only computes.
 */
export const validateCartPricingWorkflow = createWorkflow(
    "validate-cart-pricing",
    (input: ValidateCartPricingWorkflowInput) => {
        const { data: cart } = useQueryGraphStep({
            entity: "cart",
            fields: cartFieldsForRefreshSteps,
            filters: { id: input.cart_id },
            options: { isList: false, throwIfKeyNotFound: true },
        }).config({ name: "pricing-validation-cart-query" })

        const priceSetInput = transform({ cart }, ({ cart }) => {
            const row = parseGraphRow(PricingContextCartSchema, cart)
            const baseContext = {
                id: row.id,
                sales_channel_id: row.sales_channel_id,
                currency_code: row.currency_code ?? row.region?.currency_code,
                region_id: row.region_id,
                locale: row.locale,
                email: row.email,
                item_total: row.item_total,
                total: row.total,
                shipping_address: row.shipping_address,
                region: row.region,
                customer: row.customer,
                customer_id: row.customer_id ?? row.customer?.id,
            }
            return {
                data: (row.items ?? []).flatMap((item) =>
                    item.variant_id
                        ? [
                              {
                                  id: item.id,
                                  variantId: item.variant_id,
                                  context: {
                                      ...baseContext,
                                      quantity: item.quantity,
                                      is_custom_price: !!item.unit_price,
                                  },
                              },
                          ]
                        : []
                ),
            }
        })

        const calculatedPriceSets = getVariantPriceSetsStep(priceSetInput)

        const promotionCodesToApply = transform({ cart }, ({ cart }) =>
            (parseGraphRow(PricingCartRowSchema, cart).promotions ?? []).flatMap((promotion) =>
                promotion.code ? [promotion.code] : []
            )
        )

        const actions = getActionsToComputeFromPromotionsStep({
            computeActionContext: cart,
            promotionCodesToApply,
        })

        const { lineItemAdjustmentsToCreate, shippingMethodAdjustmentsToCreate } =
            prepareAdjustmentsFromPromotionActionsStep({ actions })

        const assertionInput = transform(
            {
                cart,
                priceSetInput,
                calculatedPriceSets,
                lineItemAdjustmentsToCreate,
                shippingMethodAdjustmentsToCreate,
            },
            (data) => {
                const priceSets = CalculatedPriceSetsSchema.parse(data.calculatedPriceSets)
                const currentUnitPrices: Record<string, BigNumberInput | null> = {}
                for (const { id } of data.priceSetInput.data) {
                    currentUnitPrices[id] = priceSets[id]?.calculated_amount ?? null
                }
                return {
                    cart: parseGraphRow(PricingCartRowSchema, data.cart),
                    currentUnitPrices,
                    lineItemAdjustments: data.lineItemAdjustmentsToCreate,
                    shippingMethodAdjustments: data.shippingMethodAdjustmentsToCreate,
                }
            }
        )

        assertCartPricingUnchangedStep(assertionInput)

        return new WorkflowResponse(void 0)
    }
)
