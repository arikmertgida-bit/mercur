import { beginOrderEditOrderWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { VendorPostOrderEditsReqType } from "./validators"
import { validateSellerOrder } from "../orders/helpers"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostOrderEditsReqType>,
  res: MedusaResponse<HttpTypes.AdminOrderEditResponse>
) => {
  const input = req.validatedBody as VendorPostOrderEditsReqType

  await validateSellerOrder(req.scope, req.seller_context!.seller_id, input.order_id)

  const { result } = await beginOrderEditOrderWorkflow(req.scope).run({
    input,
  })

  res.json({
    // @ts-expect-error — Medusa's own module-layer DTO (OrderPreviewDTO/
    // OrderChangeDTO/etc.) and its HTTP-response DTO (AdminOrderPreview/
    // AdminOrderChange/etc.) are two parallel type hierarchies that don't
    // structurally unify, even though the real workflow data includes every
    // field the HTTP type expects (confirmed against Medusa's own core route,
    // which passes the same shape through with zero cast/transform).
    order_change: result,
  })
}
