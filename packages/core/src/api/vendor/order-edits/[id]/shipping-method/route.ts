import { createOrderEditShippingMethodWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { VendorPostOrderEditsShippingReqType } from "../../validators"
import { validateSellerOrder } from "../../../orders/helpers"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostOrderEditsShippingReqType>,
  res: MedusaResponse<HttpTypes.AdminOrderEditPreviewResponse>
) => {
  const { id } = req.params

  await validateSellerOrder(req.scope, req.seller_context!.seller_id, id)

  const { result } = await createOrderEditShippingMethodWorkflow(req.scope).run(
    {
      input: { ...req.validatedBody, order_id: id },
    }
  )

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
