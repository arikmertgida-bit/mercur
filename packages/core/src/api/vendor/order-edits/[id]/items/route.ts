import { orderEditAddNewItemWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { resolveAddItems } from "../../../orders/resolve-add-items"
import { VendorPostOrderEditsAddItemsReqType } from "../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostOrderEditsAddItemsReqType>,
  res: MedusaResponse<HttpTypes.AdminOrderEditPreviewResponse>
) => {
  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "orders",
    fields: ["id", "currency_code"],
    filters: { id },
  })

  const order = orders?.[0] as { currency_code?: string } | undefined
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
    // @ts-expect-error — Medusa's own module-layer DTO (OrderPreviewDTO/
    // OrderChangeDTO/etc.) and its HTTP-response DTO (AdminOrderPreview/
    // AdminOrderChange/etc.) are two parallel type hierarchies that don't
    // structurally unify, even though the real workflow data includes every
    // field the HTTP type expects (confirmed against Medusa's own core route,
    // which passes the same shape through with zero cast/transform).
    order_preview: result,
  })
}
