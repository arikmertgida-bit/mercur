import { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export const validateVariantsBelongToProductStepId =
  "pc-validate-variants-belong-to-product"

type ValidateVariantsBelongToProductStepInput = {
  product_id: string
  variant_ids: string[]
}

/**
 * Second, workflow-level check that every `variant_id` an "update"/"remove"
 * operation references actually resolves under `product_id`. The API-layer
 * middleware already enforces this for the single `:variant_id` route
 * param, but this workflow is also reachable with a batch of operations
 * (multiple variant ids per call) — each one needs the same scoping, not
 * just the one that happened to be in the URL.
 */
export const validateVariantsBelongToProductStep = createStep(
  validateVariantsBelongToProductStepId,
  async (
    { product_id, variant_ids }: ValidateVariantsBelongToProductStepInput,
    { container },
  ) => {
    if (!variant_ids.length) {
      return new StepResponse(void 0)
    }

    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const { data: variants } = await query.graph({
      entity: "variant",
      fields: ["id"],
      filters: { id: variant_ids, product_id },
    })

    const foundIds = new Set(
      (variants as Array<{ id: string }>).map((variant) => variant.id),
    )
    const missingId = variant_ids.find((id) => !foundIds.has(id))

    if (missingId) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Variant with id ${missingId} was not found`,
      )
    }

    return new StepResponse(void 0)
  },
)
