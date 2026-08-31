import {
  removeItemOrderEditActionWorkflow,
  updateOrderEditAddItemWorkflow,
} from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { VendorPostOrderEditsItemsActionReqType } from "../../../validators"
import { validateSellerOrder } from "../../../../orders/helpers"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostOrderEditsItemsActionReqType>,
  res: MedusaResponse<HttpTypes.AdminOrderEditPreviewResponse>
) => {
  const { id, action_id } = req.params

  await validateSellerOrder(req.scope, req.seller_context!.seller_id, id)

  const { result } = await updateOrderEditAddItemWorkflow(req.scope).run({
    input: {
      data: { ...req.validatedBody },
      order_id: id,
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
  res: MedusaResponse<HttpTypes.AdminOrderEditPreviewResponse>
) => {
  const { id, action_id } = req.params

  await validateSellerOrder(req.scope, req.seller_context!.seller_id, id)

  const { result: orderPreview } = await removeItemOrderEditActionWorkflow(
    req.scope
  ).run({
    input: {
      order_id: id,
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
    order_preview: orderPreview,
  })
}
