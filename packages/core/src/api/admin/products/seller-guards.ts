import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  assertShippingProfileOfSeller,
  getProductSellerId,
} from "../../../workflows/product/utils/seller-ownership"

type ShippingProfileUpdate = { shipping_profile_id?: string | null }

const assertProductShippingProfile = async (
  req: AuthenticatedMedusaRequest,
  productId: string,
  update: ShippingProfileUpdate
): Promise<void> => {
  if (!update.shipping_profile_id) {
    return
  }
  const sellerId = await getProductSellerId(req.scope, productId)
  await assertShippingProfileOfSeller(
    req.scope,
    sellerId,
    update.shipping_profile_id
  )
}

/** A product ships only with a shipping profile of its own seller. */
export const ensureProductShippingProfileOfSeller = async (
  req: AuthenticatedMedusaRequest<ShippingProfileUpdate>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  try {
    await assertProductShippingProfile(req, req.params.id, req.validatedBody)
  } catch (error) {
    return next(error)
  }
  return next()
}

export const ensureBatchShippingProfilesOfSeller = async (
  req: AuthenticatedMedusaRequest<{
    update?: (ShippingProfileUpdate & { id: string })[]
  }>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  try {
    for (const update of req.validatedBody.update ?? []) {
      await assertProductShippingProfile(req, update.id, update)
    }
  } catch (error) {
    return next(error)
  }
  return next()
}
