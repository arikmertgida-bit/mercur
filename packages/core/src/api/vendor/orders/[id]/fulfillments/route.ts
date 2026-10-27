import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@mercurjs/types"

import { createOrderFulfillmentWorkflow } from "../../../../../workflows/order/workflows/create-order-fulfillment"
import { validateSellerOrder } from "../../helpers"
import { VendorCreateFulfillmentType } from "../../validators"
import { getSellerId } from "../../../../utils/seller-context"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorCreateFulfillmentType>,
  res: MedusaResponse<HttpTypes.VendorFulfillmentResponse>
) => {
  const { id } = req.params
  const sellerId = getSellerId(req)

  await validateSellerOrder(req.scope, sellerId, id)

  const { result: fulfillment } = await createOrderFulfillmentWorkflow(
    req.scope
  ).run({
    input: {
      order_id: id,
      created_by: sellerId,
      ...req.validatedBody,
    },
  })

  res.json({
    // @ts-expect-error -- Medusa boundary: createOrderFulfillmentWorkflow is
    // typed as returning the module `FulfillmentDTO` while the route contract
    // is the HTTP `AdminFulfillment` (the vendor wire shape). They differ only
    // in serialization and in provider fields the module DTO does not declare.
    fulfillment,
  })
}
