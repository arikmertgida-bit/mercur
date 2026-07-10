import { AdditionalData } from "@medusajs/framework/types"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  MercurModules,
  ProductAttributeValueDTO,
  UpsertProductAttributeValueDTO,
} from "@mercurjs/types"

import type ProductAttributeModuleService from "../../../modules/product-attribute/service"

export type UpsertProductAttributeValuesWorkflowInput = {
  attribute_id: string
  values: UpsertProductAttributeValueDTO[]
} & AdditionalData

const upsertProductAttributeValuesStepId = "pa-upsert-product-attribute-values"

type UpsertStepInput = (UpsertProductAttributeValueDTO & {
  attribute_id: string
})[]

type UpsertCompensateInput = {
  newIds: string[]
  previousValues: ProductAttributeValueDTO[]
}

// Known gap: rename-in-place does not re-sync the mirrored option.
const upsertProductAttributeValuesStep = createStep(
  upsertProductAttributeValuesStepId,
  async (data: UpsertStepInput, { container }) => {
    const service = container.resolve<ProductAttributeModuleService>(
      MercurModules.PRODUCT_ATTRIBUTE,
    )
    const toCreate = data.filter((v) => !v.id)
    const toUpdate = data.filter((v) => !!v.id)

    const previousValues = toUpdate.length
      ? await service.listProductAttributeValues({
          id: toUpdate.map((v) => v.id as string),
        })
      : []

    const created = toCreate.length
      ? await service.createProductAttributeValues(toCreate)
      : []
    const updated = toUpdate.length
      ? await service.updateProductAttributeValues(toUpdate)
      : []

    return new StepResponse([...created, ...updated], {
      newIds: created.map((v) => v.id),
      previousValues,
    })
  },
  async (compensateInput: UpsertCompensateInput | undefined, { container }) => {
    if (!compensateInput) {
      return
    }

    const service = container.resolve<ProductAttributeModuleService>(
      MercurModules.PRODUCT_ATTRIBUTE,
    )
    const { newIds, previousValues } = compensateInput

    if (newIds.length) {
      await service.deleteProductAttributeValues(newIds)
    }
    if (previousValues.length) {
      await service.updateProductAttributeValues(
        previousValues.map((value) => ({
          id: value.id,
          name: value.name,
          rank: value.rank,
          handle: value.handle,
          is_active: value.is_active,
          metadata: value.metadata,
          product_option_value_id: value.product_option_value_id,
        }))
      )
    }
  },
)

export const upsertProductAttributeValuesWorkflowId =
  "upsert-product-attribute-values"

export const upsertProductAttributeValuesWorkflow = createWorkflow(
  upsertProductAttributeValuesWorkflowId,
  function (input: UpsertProductAttributeValuesWorkflowInput) {
    const rows = transform({ input }, ({ input }) =>
      input.values.map((v) => ({ ...v, attribute_id: input.attribute_id })),
    )

    const values = upsertProductAttributeValuesStep(rows)

    return new WorkflowResponse(values as ProductAttributeValueDTO[])
  },
)
