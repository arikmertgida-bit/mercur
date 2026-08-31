import {
  removeClaimShippingMethodWorkflow,
  updateClaimShippingMethodWorkflow,
} from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"

import { VendorPostClaimsShippingActionReqType } from "../../../../validators"
import { validateSellerClaim } from "../../../../helpers"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostClaimsShippingActionReqType>,
  res: MedusaResponse<{
    order_preview: HttpTypes.AdminOrderPreview
  }>
) => {
  const { id, action_id } = req.params

  await validateSellerClaim(req.scope, req.seller_context!.seller_id, id)

  const { result } = await updateClaimShippingMethodWorkflow(req.scope).run({
    input: {
      data: { ...req.validatedBody },
      claim_id: id,
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

  await validateSellerClaim(req.scope, req.seller_context!.seller_id, id)

  const { result } = await removeClaimShippingMethodWorkflow(req.scope).run({
    input: {
      claim_id: id,
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
