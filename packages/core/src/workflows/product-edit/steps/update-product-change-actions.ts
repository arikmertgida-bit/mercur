import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { type JsonRecord, MercurModules } from "@mercurjs/types"

import type ProductChangeModuleService from "../../../modules/product-edit/service"

export const updateProductChangeActionsStepId =
  "pc-update-product-change-actions"

type UpdateProductChangeActionsStepInput = Array<{
  id: string
  applied?: boolean
  details?: JsonRecord
  internal_note?: string | null
}>

type PrevActionScalar = {
  id: string
  applied: boolean
  details: JsonRecord
  internal_note: string | null
}

export const updateProductChangeActionsStep = createStep(
  updateProductChangeActionsStepId,
  async (input: UpdateProductChangeActionsStepInput, { container }) => {
    const service = container.resolve<ProductChangeModuleService>(
      MercurModules.PRODUCT_EDIT,
    )

    const ids = input.map((i) => i.id)
    const prev = await service.listProductChangeActions({
      id: ids,
    })
    const prevScalars = prev.map(
      (action): PrevActionScalar => ({
        id: action.id,
        applied: action.applied,
        details: action.details,
        internal_note: action.internal_note,
      }),
    )

    const result = await service.updateProductChangeActions(input)
    return new StepResponse(result, prevScalars)
  },
  async (prevScalars: PrevActionScalar[] | undefined, { container }) => {
    if (!prevScalars?.length) {
      return
    }
    const service = container.resolve<ProductChangeModuleService>(
      MercurModules.PRODUCT_EDIT,
    )
    await service.updateProductChangeActions(prevScalars)
  },
)
