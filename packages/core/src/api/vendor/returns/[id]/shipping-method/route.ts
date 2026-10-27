import { createReturnShippingMethodWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { validateSellerReturn } from "../../helpers"
import { VendorPostReturnsShippingReqType } from "../../validators"
import { getSellerId } from "../../../../utils/seller-context"
import { toHttpOrderPreview } from "../../../../../utils/http-order"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostReturnsShippingReqType>,
  res: MedusaResponse<HttpTypes.VendorReturnPreviewResponse>
) => {
  const { id } = req.params

  await validateSellerReturn(req.scope, getSellerId(req), id)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { result } = await createReturnShippingMethodWorkflow(req.scope).run({
    input: { ...req.validatedBody, return_id: id },
  })

  const {
    data: [orderReturn],
  } = await query.graph({
    entity: "return",
    fields: req.queryConfig.fields,
    filters: {
      id,
      ...req.filterableFields,
    },
  })

  res.json({
    order_preview: toHttpOrderPreview(result),
    return: orderReturn,
  })
}
