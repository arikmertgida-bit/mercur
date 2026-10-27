import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { validateSellerOrder } from "../../helpers"
import { getSellerId } from "../../../../utils/seller-context"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.VendorOrderChangesResponse>
) => {
  const { id } = req.params
  const sellerId = getSellerId(req)

  await validateSellerOrder(req.scope, sellerId, id)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: order_changes } = await query.graph({
    entity: "order_change",
    fields: req.queryConfig.fields,
    filters: {
      order_id: id,
    },
  })

  res.json({ order_changes })
}
