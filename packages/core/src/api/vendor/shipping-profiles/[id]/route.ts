import {
  deleteShippingProfileWorkflow,
  updateShippingProfilesWorkflow,
} from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { getSellerId } from "../../../utils/seller-context"
import {
  refetchShippingProfile,
  validateSellerShippingProfile,
} from "../helpers"
import { VendorUpdateShippingProfileType } from "../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.VendorShippingProfileResponse>
) => {
  await validateSellerShippingProfile(req.scope, getSellerId(req), req.params.id)

  const shippingProfile = await refetchShippingProfile(
    req.scope,
    req.params.id,
    req.queryConfig.fields
  )

  if (!shippingProfile) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shipping profile with id: ${req.params.id} was not found`
    )
  }

  res.status(200).json({ shipping_profile: shippingProfile })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorUpdateShippingProfileType>,
  res: MedusaResponse<HttpTypes.VendorShippingProfileResponse>
) => {
  const { id } = req.params

  await validateSellerShippingProfile(req.scope, getSellerId(req), id)

  await updateShippingProfilesWorkflow(req.scope).run({
    input: { selector: { id }, update: req.validatedBody },
  })

  const shippingProfile = await refetchShippingProfile(
    req.scope,
    id,
    req.queryConfig.fields
  )

  res.status(200).json({ shipping_profile: shippingProfile })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.VendorShippingProfileDeleteResponse>
) => {
  const { id } = req.params

  await validateSellerShippingProfile(req.scope, getSellerId(req), id)

  await deleteShippingProfileWorkflow(req.scope).run({
    input: { ids: [id] },
  })

  res.status(200).json({
    id,
    object: "shipping_profile",
    deleted: true,
  })
}
