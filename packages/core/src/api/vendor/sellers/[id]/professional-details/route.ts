import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  HttpTypes
} from "@mercurjs/types"

import { VendorUpsertSellerProfessionalDetailsType } from "../../validators"
import { assertOwnSeller } from "../../helpers"
import {
  updateSellerProfessionalDetailsWorkflow,
  deleteSellerProfessionalDetailsWorkflow,
} from "../../../../../workflows/seller"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorUpsertSellerProfessionalDetailsType>,
  res: MedusaResponse<HttpTypes.VendorSellerResponse>
) => {
  assertOwnSeller(req)

  const { additional_data, ...data } = req.validatedBody

  await updateSellerProfessionalDetailsWorkflow(req.scope).run({
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

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.VendorSellerResponse>
) => {
  assertOwnSeller(req)

  await deleteSellerProfessionalDetailsWorkflow(req.scope).run({
    input: {
      seller_id: req.params.id,
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
