import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import { HttpTypes } from "@mercurjs/types"
import { z } from "zod"

import { InventoryWorkflowEvents } from "../../../../../workflows"
import { parseGraphRow, parseGraphRows } from "../../../../../utils/graph-rows"

const ReservationItemRowSchema = z.object({ inventory_item_id: z.string() })

// Line items are reached through the order's own `items` relation: Medusa's
// OrderLineItem has no `order_id` column (it belongs to an order via
// OrderItem), so filtering `order_line_item` by `order_id` throws.
const OrderWithItemsRowSchema = z.object({
  id: z.string(),
  items: z.array(z.object({ id: z.string() })).nullish(),
})

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.StoreOrderResponse>
) => {
  const customerId = req.auth_context.actor_id
  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [orderRow],
  } = await query.graph({
    entity: "order",
    filters: { id, customer_id: customerId },
    fields: ["id", "items.id"],
  })

  if (!orderRow) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order with id ${id} was not found`
    )
  }

  const order = parseGraphRow(OrderWithItemsRowSchema, orderRow)
  const lineItemIds = (order.items ?? []).map((item) => item.id)
  const affectedReservations = lineItemIds.length
    ? parseGraphRows(
        ReservationItemRowSchema,
        (
          await query.graph({
            entity: "reservation",
            fields: ["inventory_item_id"],
            filters: { line_item_id: lineItemIds },
          })
        ).data
      )
    : []

  await cancelOrderWorkflow(req.scope).run({
    input: {
      order_id: id,
      canceled_by: customerId,
    },
  })

  const changedInventoryItemIds = Array.from(
    new Set(affectedReservations.map((r) => r.inventory_item_id))
  )
  if (changedInventoryItemIds.length) {
    await req.scope.resolve(Modules.EVENT_BUS).emit({
      name: InventoryWorkflowEvents.LEVEL_CHANGED,
      data: { inventory_item_ids: changedInventoryItemIds },
    })
  }

  const {
    data: [canceledOrder],
  } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "status",
      "canceled_at",
      "fulfillment_status",
      "payment_status",
      "display_id",
      "email",
    ],
    filters: { id },
  })

  res.json({ order: canceledOrder })
}
