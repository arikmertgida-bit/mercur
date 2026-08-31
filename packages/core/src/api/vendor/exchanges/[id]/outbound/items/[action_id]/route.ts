import {
  removeItemExchangeActionWorkflow,
  updateExchangeAddItemWorkflow,
} from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { VendorPostExchangesItemsActionReqType } from "../../../../validators"
import { validateSellerExchange } from "../../../../helpers"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostExchangesItemsActionReqType>,
  res: MedusaResponse<{
    order_preview: HttpTypes.AdminOrderPreview
  }>
) => {
  const { id, action_id } = req.params

  await validateSellerExchange(req.scope, req.seller_context!.seller_id, id)

  const { result } = await updateExchangeAddItemWorkflow(req.scope).run({
    input: {
      data: { ...req.validatedBody },
      exchange_id: id,
      action_id,
    },
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

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<{
    order_preview: HttpTypes.AdminOrderPreview
  }>
) => {
  const { id, action_id } = req.params

  await validateSellerExchange(req.scope, req.seller_context!.seller_id, id)

  const { result } = await removeItemExchangeActionWorkflow(req.scope).run({
    input: {
      exchange_id: id,
      action_id,
    },
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
