import {
  WorkflowData,
  WorkflowResponse,
  createHook,
  createWorkflow,
  transform,
  type Hook,
  type ReturnWorkflow,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import {
  CommissionCalculationContext,
  CommissionLineDTO,
} from "@mercurjs/types"
import { z } from "zod"

import { getCommissionLinesStep, upsertCommissionLinesStep } from "../steps"
import { GraphBigNumberSchema, parseGraphRows } from "../../../utils/graph-rows"

const orderFields = [
  "id",
  "status",
  "version",
  "currency_code",
  "email",
  "canceled_at",
  "sales_channel_id",
  "region_id",
  "customer_id",
  "customer.*",
  "customer.groups.*",
  "promotions.*",
  "subtotal",
  "seller.id",
  "items.*",
  "items.subtotal",
  "items.tax_total",
  "items.total",
  "items.product.id",
  "items.product.collection_id",
  "items.product.categories.id",
  "items.product.tags.id",
  "items.product.type_id",
  "items.product.attribute_values.id",
  "items.adjustments.*",
  "shipping_methods.*",
  "shipping_methods.total",
  "shipping_methods.subtotal",
  "shipping_methods.tax_total",
  "shipping_methods.adjustments.*",
  "shipping_methods.shipping_option_id",
  "shipping_address.*",
]

const IdRefSchema = z.object({ id: z.string() })

const OrderForCommissionRefreshSchema = z.object({
  id: z.string(),
  currency_code: z.string(),
  seller: IdRefSchema.nullish(),
  items: z
    .array(
      z.object({
        id: z.string(),
        subtotal: GraphBigNumberSchema,
        tax_total: GraphBigNumberSchema.nullish(),
        total: GraphBigNumberSchema.nullish(),
        product: z
          .object({
            id: z.string(),
            collection_id: z.string().nullish(),
            categories: z.array(IdRefSchema).nullish(),
            tags: z.array(IdRefSchema).nullish(),
            type_id: z.string().nullish(),
            attribute_values: z.array(IdRefSchema).nullish(),
          })
          .nullish(),
      })
    )
    .nullish(),
  shipping_methods: z
    .array(
      z.object({
        id: z.string(),
        subtotal: GraphBigNumberSchema,
        tax_total: GraphBigNumberSchema.nullish(),
      })
    )
    .nullish(),
})

export type RefreshOrderCommissionLinesWorkflowInput = {
  order_ids: string[]
}

export const refreshOrderCommissionLinesWorkflowId = "refresh-order-commission-lines"

/**
 * `setCommissionContext` receives the contexts built from the orders. A
 * handler returns `new StepResponse(contexts)` with `additional_context`
 * filled in, or nothing to leave the contexts as they are.
 *
 * `commissionLinesUpserted` runs after the lines are written, inside the same
 * transaction, so a consumer's failure rolls the refresh back.
 */
export type RefreshOrderCommissionLinesWorkflowHooks = [
  Hook<
    "setCommissionContext",
    { contexts: CommissionCalculationContext[] },
    CommissionCalculationContext[] | undefined
  >,
  Hook<
    "commissionLinesUpserted",
    { order_ids: string[]; commission_lines: CommissionLineDTO[] },
    void
  >,
]

export const refreshOrderCommissionLinesWorkflow: ReturnWorkflow<
  RefreshOrderCommissionLinesWorkflowInput,
  CommissionLineDTO[],
  RefreshOrderCommissionLinesWorkflowHooks
> = createWorkflow(
  refreshOrderCommissionLinesWorkflowId,
  function (
    input: WorkflowData<RefreshOrderCommissionLinesWorkflowInput>
  ) {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: orderFields,
      filters: { id: input.order_ids },
      options: {
        throwIfKeyNotFound: true,
      },
    }).config({ name: "fetch-orders" })

    const commissionContexts = transform({ orders }, ({ orders }) => {
      return parseGraphRows(OrderForCommissionRefreshSchema, orders).map((order): CommissionCalculationContext => {
        // The order's own seller link (order-seller-link.ts) is 1:1 by
        // design — Order Splitting guarantees a single order never spans
        // more than one seller. `product.sellers` on the other hand is the
        // master-product allowlist (product-seller-link.ts, many-to-many):
        // a shared product can be linked to several sellers, so picking
        // `product.sellers[0]` there would resolve an arbitrary allowlisted
        // seller instead of the seller this order actually belongs to,
        // silently matching seller-scoped commission rules to the wrong
        // seller for any product shared across multiple sellers.
        const orderSellerId = order.seller?.id ?? undefined

        return {
          currency_code: order.currency_code,
          order_id: order.id,
          seller_id: orderSellerId,
          items: (order.items ?? []).map((item) => ({
            id: item.id,
            subtotal: item.subtotal,
            tax_total: item.tax_total ?? undefined,
            total: item.total ?? undefined,
            product: item.product
              ? {
                id: item.product.id,
                collection_id: item.product.collection_id ?? undefined,
                categories: item.product.categories ?? undefined,
                tags: item.product.tags ?? undefined,
                type_id: item.product.type_id ?? undefined,
                seller: orderSellerId ? { id: orderSellerId } : undefined,
                attribute_value_ids: (item.product.attribute_values ?? [])
                  .map((value) => value.id),
              }
              : undefined,
          })),
          shipping_methods: (order.shipping_methods ?? []).map((method) => ({
            id: method.id,
            subtotal: method.subtotal,
            tax_total: method.tax_total ?? undefined,
          })),
        }
      })
    })

    const setCommissionContext: RefreshOrderCommissionLinesWorkflowHooks[0] =
      createHook("setCommissionContext", {
        contexts: commissionContexts,
      })

    const contexts = transform(
      { commissionContexts, hookResult: setCommissionContext.getResult() },
      ({ commissionContexts, hookResult }): CommissionCalculationContext[] =>
        hookResult ?? commissionContexts
    )

    const commissionLines = getCommissionLinesStep(contexts)

    const upsertedCommissionLines = upsertCommissionLinesStep({
      commission_lines: commissionLines,
    })

    const commissionLinesUpserted = createHook("commissionLinesUpserted", {
      order_ids: input.order_ids,
      commission_lines: upsertedCommissionLines,
    })

    return new WorkflowResponse(upsertedCommissionLines, {
      hooks: [setCommissionContext, commissionLinesUpserted],
    })
  }
)
