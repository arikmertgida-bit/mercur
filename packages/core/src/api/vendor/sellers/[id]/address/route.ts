import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { VendorUpsertSellerAddressType } from "../../validators"
import { assertOwnSeller } from "../../helpers"
import { updateSellerAddressWorkflow } from "../../../../../workflows/seller"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorUpsertSellerAddressType>,
  res: MedusaResponse<HttpTypes.VendorSellerResponse>
) => {
  assertOwnSeller(req)

  const { additional_data, ...data } = req.validatedBody

  await updateSellerAddressWorkflow(req.scope).run({
    input: {
      seller_id: req.params.id,
      data,
      additional_data,
    },
  })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [seller],
  } = await query.graph({
    entity: "seller",
    fields: req.queryConfig.fields,
    filters: { id: req.params.id },
  })

  res.json({ seller })
}
