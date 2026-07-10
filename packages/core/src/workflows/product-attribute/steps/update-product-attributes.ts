import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  MercurModules,
  ProductAttributeDTO,
  UpdateProductAttributeDTO,
} from "@mercurjs/types"

import type ProductAttributeModuleService from "../../../modules/product-attribute/service"

export const updateProductAttributesStepId = "pa-update-product-attributes"

type UpdateProductAttributesStepInput = {
  selector: Record<string, unknown>
  update: UpdateProductAttributeDTO
}

export const updateProductAttributesStep = createStep(
  updateProductAttributesStepId,
  async (
    { selector, update }: UpdateProductAttributesStepInput,
    { container },
  ) => {
    const service = container.resolve<ProductAttributeModuleService>(
      MercurModules.PRODUCT_ATTRIBUTE,
    )
    const prevAttributes = await service.listProductAttributes(selector)
    const attributesToUpdate = prevAttributes.map((a) => ({
      id: a.id,
      ...update,
    }))
    const attributes = await service.updateProductAttributes(attributesToUpdate)
    return new StepResponse(attributes, prevAttributes)
  },
  async (prevAttributes: ProductAttributeDTO[] | undefined, { container }) => {
    if (!prevAttributes?.length) {
      return
    }
    const service = container.resolve<ProductAttributeModuleService>(
      MercurModules.PRODUCT_ATTRIBUTE,
    )
    await service.updateProductAttributes(
      prevAttributes.map((a) => ({
        id: a.id,
        handle: a.handle ?? undefined,
        name: a.name,
        description: a.description,
        type: a.type,
        is_required: a.is_required,
        is_filterable: a.is_filterable,
        is_variant_axis: a.is_variant_axis,
        rank: a.rank,
        is_active: a.is_active,
        product_option_id: a.product_option_id,
        metadata: a.metadata,
      })),
    )
  },
)
