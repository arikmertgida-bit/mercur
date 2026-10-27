import { Query } from "@medusajs/framework"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { ProductAttributeErrorCode } from "@mercurjs/types"
import { z } from "zod"

import { parseGraphRows } from "../../../utils/graph-rows"

const AttributeValueProductsRowSchema = z.object({
  id: z.string(),
  products: z.array(z.object({ id: z.string() })).nullish(),
})

export const validateProductAttributeValuesNotLinkedStepId =
  "pa-validate-attribute-values-not-linked"

export const validateProductAttributeValuesNotLinkedStep = createStep(
  validateProductAttributeValuesNotLinkedStepId,
  async (ids: string[], { container }) => {
    if (!ids?.length) {
      return new StepResponse(void 0)
    }

    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product_attribute_value",
      fields: ["id", "products.id"],
      filters: { id: ids },
    })

    const linkedValueIds = parseGraphRows(AttributeValueProductsRowSchema, data)
      .filter((value) => (value.products?.length ?? 0) > 0)
      .map((value) => value.id)

    if (linkedValueIds.length > 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Cannot delete product attribute value(s) ${linkedValueIds.join(
          ", ",
        )}: they are in use on one or more products.`,
        ProductAttributeErrorCode.VALUE_IN_USE,
      )
    }

    return new StepResponse(void 0)
  },
)
