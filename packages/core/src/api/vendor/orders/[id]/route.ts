import { getOrderDetailWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { HttpTypes } from "@mercurjs/types"

import {
  normalizeOrderPaymentCollections,
  validateSellerOrder,
  withCartPaymentCollectionFields,
} from "../helpers"
import { getSellerId } from "../../../utils/seller-context"
import { VendorGetOrderParamsType } from "../validators"
import { toHttpOrder } from "../../../../utils/http-order"

export const GET = async (
  req: AuthenticatedMedusaRequest<
    Partial<VendorGetOrderParamsType>,
    VendorGetOrderParamsType
  >,
  res: MedusaResponse<HttpTypes.VendorOrderResponse>
) => {
  const sellerId = getSellerId(req)

  await validateSellerOrder(req.scope, sellerId, req.params.id)

  const workflow = getOrderDetailWorkflow(req.scope)
  const { result } = await workflow.run({
    input: {
      fields: withCartPaymentCollectionFields(req.queryConfig.fields),
      order_id: req.params.id,
    },
  })

  normalizeOrderPaymentCollections(result)

  res.json({ order: toHttpOrder(result) })
}
