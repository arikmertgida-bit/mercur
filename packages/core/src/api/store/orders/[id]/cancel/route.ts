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
import { InventoryWorkflowEvents } from "../../../../../workflows"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.StoreOrderResponse>
) => {
  const customerId = req.auth_context.actor_id
  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    filters: { id, customer_id: customerId },
    fields: ["id"],
  })

  if (!order) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order with id ${id} was not found`
    )
  }

  const { data: orderItems } = await query.graph({
    entity: "order_line_item",
    fields: ["id"],
    filters: { order_id: id },
  })
  const lineItemIds = orderItems.map((item) => item.id)
  const { data: affectedReservations } = lineItemIds.length
    ? await query.graph({
        entity: "reservation",
        fields: ["inventory_item_id"],
        filters: { line_item_id: lineItemIds },
      })
    : { data: [] as { inventory_item_id: string }[] }

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
