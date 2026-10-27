import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"

import { z } from "zod"

import { deleteOrderCommissionLinesStep } from "../steps/delete-order-commission-lines"
import { parseGraphRows } from "../../../utils/graph-rows"

export type ClearOrderCommissionLinesWorkflowInput = {
  order_ids: string[]
}

const OrderForCommissionClearSchema = z.object({
  items: z.array(z.object({ id: z.string() })).nullish(),
  shipping_methods: z.array(z.object({ id: z.string() })).nullish(),
})

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
      const items = parseGraphRows(OrderForCommissionClearSchema, orders)
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
