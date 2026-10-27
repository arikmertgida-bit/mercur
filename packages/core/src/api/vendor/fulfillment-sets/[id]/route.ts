import { deleteFulfillmentSetsWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@mercurjs/types"

import { validateSellerFulfillmentSet } from "../helpers"
import { getSellerId } from "../../../utils/seller-context"

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.VendorDeleteResponse>
) => {
  const { id } = req.params
  const sellerId = getSellerId(req)

  await validateSellerFulfillmentSet(req.scope, sellerId, id)

  await deleteFulfillmentSetsWorkflow(req.scope).run({
    input: { ids: [id] },
  })

  res.json({
    id,
    object: "fulfillment_set",
    deleted: true,
  })
}
