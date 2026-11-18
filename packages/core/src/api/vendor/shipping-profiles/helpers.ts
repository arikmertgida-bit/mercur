import { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "zod"

import { parseGraphRows } from "../../../utils/graph-rows"

const ShippingProfileLinkRowSchema = z.object({
  shipping_profile_id: z.string(),
})

/**
 * A seller may only read or use the shipping profiles linked to it. Any id
 * outside that set — another seller's profile or an operator profile — is
 * reported as NOT_FOUND so the route cannot be used to probe for ids.
 */
export const validateSellerShippingProfiles = async (
  scope: MedusaContainer,
  sellerId: string,
  shippingProfileIds: string[]
): Promise<void> => {
  const ids = Array.from(new Set(shippingProfileIds))
  if (!ids.length) {
    return
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: links } = await query.graph({
    entity: "shipping_profile_seller",
    filters: {
      seller_id: sellerId,
      shipping_profile_id: ids,
    },
    fields: ["shipping_profile_id"],
  })

  const owned = new Set(
    parseGraphRows(ShippingProfileLinkRowSchema, links).map(
      (link) => link.shipping_profile_id
    )
  )
  const missing = ids.find((id) => !owned.has(id))

  if (missing) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shipping profile with id: ${missing} was not found`
    )
  }
}

export const validateSellerShippingProfile = (
  scope: MedusaContainer,
  sellerId: string,
  shippingProfileId: string | null | undefined
): Promise<void> =>
  validateSellerShippingProfiles(
    scope,
    sellerId,
    shippingProfileId ? [shippingProfileId] : []
  )

export const refetchShippingProfile = async (
  scope: MedusaContainer,
  shippingProfileId: string,
  fields: string[]
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [shippingProfile],
  } = await query.graph({
    entity: "shipping_profile",
    filters: { id: shippingProfileId },
    fields,
  })

  return shippingProfile
}
