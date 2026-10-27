import { orderEditAddNewItemWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { OrderCurrencyRowSchema, resolveAddItems } from "../../../../vendor/orders/resolve-add-items"
import { parseGraphRows } from "../../../../../utils/graph-rows"
import { toHttpOrderPreview } from "../../../../../utils/http-order"

type AdminAddItemsBody = {
  items: Array<{
    variant_id: string
    quantity: number
    unit_price?: number | null
    compare_at_unit_price?: number | null
    internal_note?: string | null
    allow_backorder?: boolean
    metadata?: HttpTypes.AdminAddOrderEditItems["items"][number]["metadata"] | null
  }>
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminAddItemsBody>,
  res: MedusaResponse<HttpTypes.AdminOrderEditPreviewResponse>
) => {
  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "currency_code"],
    filters: { id },
  })

  const order = parseGraphRows(OrderCurrencyRowSchema, orders)[0]
  if (!order?.currency_code) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order ${id} not found`
    )
  }

  const items = await resolveAddItems({
    container: req.scope,
    currencyCode: order.currency_code,
    items: req.validatedBody.items,
  })

  const { result } = await orderEditAddNewItemWorkflow(req.scope).run({
    input: { items, order_id: id },
  })

  res.json({
    order_preview: toHttpOrderPreview(result),
  })
}
