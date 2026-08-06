import {
  WorkflowData,
  WorkflowResponse,
  createHook,
  createWorkflow,
  transform,
  type Hook,
  type ReturnWorkflow,
} from "@medusajs/framework/workflows-sdk"
import { BigNumberInput } from "@medusajs/framework/types"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import {
  CommissionCalculationContext,
  CommissionLineDTO,
} from "@mercurjs/types"

import { getCommissionLinesStep, upsertCommissionLinesStep } from "../steps"

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

type OrderForCommissionRefresh = {
  id: string
  currency_code: string
  seller?: { id: string } | null
  items?: Array<{
    id: string
    subtotal: BigNumberInput
    tax_total?: BigNumberInput
    total?: BigNumberInput
    product?: {
      id: string
      collection_id?: string
      categories?: { id: string }[]
      tags?: { id: string }[]
      type_id?: string
      attribute_values?: { id: string }[]
    }
  }>
  shipping_methods?: Array<{
    id: string
    subtotal: BigNumberInput
    tax_total?: BigNumberInput
  }>
}

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
    CommissionCalculationContext[] | void
  >,
  Hook<
    "commissionLinesUpserted",
    { order_ids: string[]; commission_lines: CommissionLineDTO[] },
    unknown
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
      return (orders as OrderForCommissionRefresh[]).map((order): CommissionCalculationContext => {
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
            tax_total: item.tax_total,
            total: item.total,
            product: item.product
              ? {
                id: item.product.id,
                collection_id: item.product.collection_id,
                categories: item.product.categories,
                tags: item.product.tags,
                type_id: item.product.type_id,
                seller: orderSellerId ? { id: orderSellerId } : undefined,
                attribute_value_ids: (item.product.attribute_values ?? [])
                  .map((value: { id: string }) => value.id),
              }
              : undefined,
          })),
          shipping_methods: (order.shipping_methods ?? []).map((method) => ({
            id: method.id,
            subtotal: method.subtotal,
            tax_total: method.tax_total,
          })),
        }
      })
    })

    const setCommissionContext = createHook("setCommissionContext", {
      contexts: commissionContexts,
    })

    const contexts = transform(
      { commissionContexts, hookResult: setCommissionContext.getResult() },
      ({ commissionContexts, hookResult }): CommissionCalculationContext[] =>
        (hookResult as CommissionCalculationContext[] | undefined) ??
        commissionContexts
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
