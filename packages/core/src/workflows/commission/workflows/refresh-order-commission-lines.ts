import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { BigNumberInput } from "@medusajs/framework/types"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { CommissionCalculationContext, CommissionLineDTO } from "@mercurjs/types"

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
  "items.*",
  "items.subtotal",
  "items.tax_total",
  "items.product.id",
  "items.product.collection_id",
  "items.product.categories.id",
  "items.product.tags.id",
  "items.product.type_id",
  "items.offer.seller_id",
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
  currency_code: string
  items?: Array<{
    id: string
    subtotal: BigNumberInput
    tax_total?: BigNumberInput
    product?: {
      id: string
      collection_id?: string
      categories?: { id: string }[]
      tags?: { id: string }[]
      type_id?: string
    }
    offer?: { seller_id?: string }
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


export const refreshOrderCommissionLinesWorkflow = createWorkflow(
  refreshOrderCommissionLinesWorkflowId,
  function (
    input: WorkflowData<RefreshOrderCommissionLinesWorkflowInput>
  ): WorkflowResponse<CommissionLineDTO[]> {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: orderFields,
      filters: { id: input.order_ids },
      options: {
        throwIfKeyNotFound: true,
      },
    }).config({ name: "fetch-orders" })

    const commissionContexts = transform({ orders }, ({ orders }) => {
      return (orders as OrderForCommissionRefresh[]).map((order): CommissionCalculationContext => ({
        currency_code: order.currency_code,
        items: (order.items ?? []).map((item) => ({
          id: item.id,
          subtotal: item.subtotal,
          tax_total: item.tax_total,
          product: item.product
            ? {
              id: item.product.id,
              collection_id: item.product.collection_id,
              categories: item.product.categories,
              tags: item.product.tags,
              type_id: item.product.type_id,
              seller: item.offer?.seller_id
                ? { id: item.offer.seller_id }
                : undefined,
            }
            : undefined,
        })),
        shipping_methods: (order.shipping_methods ?? []).map((method) => ({
          id: method.id,
          subtotal: method.subtotal,
          tax_total: method.tax_total,
        })),
      }))
    })

    const commissionLines = getCommissionLinesStep(commissionContexts)

    const upsertedCommissionLines = upsertCommissionLinesStep({
      commission_lines: commissionLines,
    })

    return new WorkflowResponse(upsertedCommissionLines)
  }
)
