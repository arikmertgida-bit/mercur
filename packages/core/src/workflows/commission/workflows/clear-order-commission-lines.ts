import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"

import { deleteOrderCommissionLinesStep } from "../steps/delete-order-commission-lines"

export type ClearOrderCommissionLinesWorkflowInput = {
  order_ids: string[]
}

type OrderForCommissionClear = {
  items?: Array<{ id: string }>
  shipping_methods?: Array<{ id: string }>
}

export const clearOrderCommissionLinesWorkflowId = "clear-order-commission-lines"

/**
 * Deletes an order's commission lines outright, rather than recomputing
 * them (see refreshOrderCommissionLinesWorkflow) — used when the order was
 * canceled, so there is nothing left for the recompute to base a rate on:
 * the customer kept none of it, the seller earns no commission on it.
 */
export const clearOrderCommissionLinesWorkflow = createWorkflow(
  clearOrderCommissionLinesWorkflowId,
  function (
    input: WorkflowData<ClearOrderCommissionLinesWorkflowInput>
  ): WorkflowResponse<string[]> {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: ["id", "items.id", "shipping_methods.id"],
      filters: { id: input.order_ids },
    }).config({ name: "fetch-orders" })

    const anchorIds = transform({ orders }, ({ orders }) => {
      const items = orders as OrderForCommissionClear[]
      return {
        item_ids: items.flatMap((order) =>
          (order.items ?? []).map((item) => item.id)
        ),
        shipping_method_ids: items.flatMap((order) =>
          (order.shipping_methods ?? []).map((method) => method.id)
        ),
      }
    })

    const deletedIds = deleteOrderCommissionLinesStep(anchorIds)

    return new WorkflowResponse(deletedIds)
  }
)
