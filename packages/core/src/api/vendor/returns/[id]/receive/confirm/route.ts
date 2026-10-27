import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { confirmReturnReceiveWorkflow } from "../../../../../../workflows/order/workflows/confirm-return-receive"
import { validateSellerReturn } from "../../../helpers"
import { VendorPostReturnsConfirmRequestReqType } from "../../../validators"
import { getSellerId } from "../../../../../utils/seller-context"
import { toHttpOrderPreview } from "../../../../../../utils/http-order"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostReturnsConfirmRequestReqType>,
  res: MedusaResponse<HttpTypes.VendorReturnPreviewResponse>
) => {
  const { id } = req.params

  await validateSellerReturn(req.scope, getSellerId(req), id)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { result } = await confirmReturnReceiveWorkflow(req.scope).run({
    input: {
      return_id: id,
      confirmed_by: getSellerId(req),
      no_notification: req.validatedBody.no_notification,
    },
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
