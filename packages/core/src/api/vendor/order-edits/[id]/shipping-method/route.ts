import { createOrderEditShippingMethodWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { VendorPostOrderEditsShippingReqType } from "../../validators"
import { toHttpOrderPreview } from "../../../../../utils/http-order"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostOrderEditsShippingReqType>,
  res: MedusaResponse<HttpTypes.AdminOrderEditPreviewResponse>
) => {
  const { id } = req.params

  const { result } = await createOrderEditShippingMethodWorkflow(req.scope).run(
    {
      input: { ...req.validatedBody, order_id: id },
    }
  )

  res.json({
    order_preview: toHttpOrderPreview(result),
  })
}
