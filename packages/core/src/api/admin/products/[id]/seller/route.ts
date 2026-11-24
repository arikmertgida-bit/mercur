import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { changeProductSellerWorkflow } from "../../../../../workflows/product/workflows/change-product-seller"
import { enrichProductAttributes } from "../../../../utils"
import { AdminChangeProductSellerType } from "../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminChangeProductSellerType>,
  res: MedusaResponse<HttpTypes.AdminProductResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  await changeProductSellerWorkflow(req.scope).run({
    input: {
      product_id: req.params.id,
      seller_id: req.validatedBody.seller_id,
      shipping_profile_id: req.validatedBody.shipping_profile_id,
    },
  })

  const {
    data: [product],
  } = await query.graph({
    entity: "product",
    fields: req.queryConfig.fields,
    filters: { id: req.params.id },
  })

  await enrichProductAttributes(req.scope, [product])

  res.status(200).json({ product })
}
