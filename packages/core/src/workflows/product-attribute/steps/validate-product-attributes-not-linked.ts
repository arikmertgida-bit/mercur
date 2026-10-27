import { Query } from "@medusajs/framework"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { ProductAttributeErrorCode } from "@mercurjs/types"
import { z } from "zod"

import { parseGraphRows } from "../../../utils/graph-rows"

const AttributeValueProductsRowSchema = z.object({
  attribute_id: z.string().nullable(),
  products: z.array(z.object({ id: z.string() })).nullish(),
})

export const validateProductAttributesNotLinkedStepId =
  "pa-validate-attributes-not-linked"

export const validateProductAttributesNotLinkedStep = createStep(
  validateProductAttributesNotLinkedStepId,
  async (ids: string[], { container }) => {
    if (!ids?.length) {
      return new StepResponse(void 0)
    }

    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product_attribute_value",
      fields: ["id", "attribute_id", "products.id"],
      filters: { attribute_id: ids },
    })

    const linkedAttributeIds = new Set<string>()
    for (const value of parseGraphRows(AttributeValueProductsRowSchema, data)) {
      if (value.attribute_id && (value.products?.length ?? 0) > 0) {
        linkedAttributeIds.add(value.attribute_id)
      }
    }

    if (linkedAttributeIds.size > 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Cannot delete product attribute(s) ${[...linkedAttributeIds].join(
          ", ",
        )}: they are in use on one or more products.`,
        ProductAttributeErrorCode.ATTRIBUTE_IN_USE,
      )
    }

    return new StepResponse(void 0)
  },
)
