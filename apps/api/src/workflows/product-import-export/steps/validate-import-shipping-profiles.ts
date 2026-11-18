import type { Query } from "@medusajs/framework"
import { AdminCreateProduct } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "zod"

const ShippingProfileLinkRowSchema = z.object({
  shipping_profile_id: z.string(),
})

type ValidateImportShippingProfilesStepInput = {
  products: AdminCreateProduct[]
  seller_id: string
}

/**
 * The CSV "Shipping Profile Id" column reaches product creation untouched,
 * so an import could attach products to another seller's shipping profile.
 * Only the importing seller's own profiles are accepted.
 */
export const validateImportShippingProfilesStep = createStep(
  "validate-import-shipping-profiles",
  async (input: ValidateImportShippingProfilesStepInput, { container }) => {
    const ids = Array.from(
      new Set(
        input.products.flatMap((product) =>
          product.shipping_profile_id ? [product.shipping_profile_id] : []
        )
      )
    )

    if (!ids.length) {
      return new StepResponse(undefined)
    }

    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const { data } = await query.graph({
      entity: "shipping_profile_seller",
      filters: { seller_id: input.seller_id, shipping_profile_id: ids },
      fields: ["shipping_profile_id"],
    })

    const owned = new Set(
      z
        .array(ShippingProfileLinkRowSchema)
        .parse(data)
        .map((row) => row.shipping_profile_id)
    )
    const missing = ids.find((id) => !owned.has(id))

    if (missing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Shipping profile with id: ${missing} was not found`
      )
    }

    return new StepResponse(undefined)
  }
)
