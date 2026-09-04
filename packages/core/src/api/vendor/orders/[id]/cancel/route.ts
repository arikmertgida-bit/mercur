import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"
import { InventoryWorkflowEvents } from "../../../../../workflows"

import { validateSellerOrder } from "../../helpers"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.VendorOrderResponse>
) => {
  const { id } = req.params
  const sellerId = req.seller_context!.seller_id

  await validateSellerOrder(req.scope, sellerId, id)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

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
      canceled_by: sellerId,
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
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: req.queryConfig.fields,
    filters: { id },
  })

  res.json({ order })
}
