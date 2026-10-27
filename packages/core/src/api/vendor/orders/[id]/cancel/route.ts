import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"
import { z } from "zod"
import { InventoryWorkflowEvents } from "../../../../../workflows"

import { validateSellerOrder } from "../../helpers"
import { getSellerId } from "../../../../utils/seller-context"
import { parseGraphRow, parseGraphRows } from "../../../../../utils/graph-rows"

const ReservationItemRowSchema = z.object({ inventory_item_id: z.string() })

// Line items are reached through the order's own `items` relation: Medusa's
// OrderLineItem has no `order_id` column (it belongs to an order via
// OrderItem), so filtering `order_line_item` by `order_id` throws.
const OrderItemsRowSchema = z.object({
  items: z.array(z.object({ id: z.string() })).nullish(),
})

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.VendorOrderResponse>
) => {
  const { id } = req.params
  const sellerId = getSellerId(req)

  await validateSellerOrder(req.scope, sellerId, id)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [orderRow],
  } = await query.graph({
    entity: "order",
    fields: ["items.id"],
    filters: { id },
  })
  const lineItemIds = (
    parseGraphRow(OrderItemsRowSchema, orderRow).items ?? []
  ).map((item) => item.id)
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
