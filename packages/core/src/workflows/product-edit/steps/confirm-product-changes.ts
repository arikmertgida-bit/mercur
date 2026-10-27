import type { InferEntityType } from "@medusajs/framework/types"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MercurModules, ProductChangeStatus } from "@mercurjs/types"

import type ProductChangeModuleService from "../../../modules/product-edit/service"
import { ProductChange } from "../../../modules/product-edit/models"

export const confirmProductChangesStepId = "pc-confirm-product-changes"

type ConfirmProductChangesStepInput = Array<{
  id: string
  confirmed_by?: string
  internal_note?: string
  external_note?: string
}>

type ProductChangeEntity = InferEntityType<typeof ProductChange>

type PrevChangeScalar = {
  id: string
  status: ProductChangeStatus
  confirmed_by: string | null
  confirmed_at: Date | null
  internal_note: string | null
  external_note: string | null
}

const pickPrev = (c: ProductChangeEntity): PrevChangeScalar => ({
  id: c.id,
  status: c.status,
  confirmed_by: c.confirmed_by ?? null,
  confirmed_at: c.confirmed_at ?? null,
  internal_note: c.internal_note ?? null,
  external_note: c.external_note ?? null,
})

export const confirmProductChangesStep = createStep(
  confirmProductChangesStepId,
  async (input: ConfirmProductChangesStepInput, { container }) => {
    const service = container.resolve<ProductChangeModuleService>(
      MercurModules.PRODUCT_EDIT,
    )

    const ids = input.map((i) => i.id)
    const prev = await service.listProductChanges({ id: ids })
    const prevScalars = prev.map(pickPrev)

    const now = new Date()
    const updates = input.map((item) => ({
      id: item.id,
      status: ProductChangeStatus.CONFIRMED,
      confirmed_by: item.confirmed_by ?? null,
      confirmed_at: now,
      ...(item.internal_note !== undefined
        ? { internal_note: item.internal_note }
        : {}),
      ...(item.external_note !== undefined
        ? { external_note: item.external_note }
        : {}),
    }))

    const result = await service.updateProductChanges(updates)
    return new StepResponse(result, prevScalars)
  },
  async (prevScalars: PrevChangeScalar[] | undefined, { container }) => {
    if (!prevScalars?.length) {
      return
    }
    const service = container.resolve<ProductChangeModuleService>(
      MercurModules.PRODUCT_EDIT,
    )
    await service.updateProductChanges(prevScalars)
  },
)
