import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CommissionLineDTO, CreateCommissionLineDTO, MercurModules } from "@mercurjs/types"

import CommissionModuleService from "../../../modules/commission/service"

export const deleteOrderCommissionLinesStepId = "delete-order-commission-lines"

export type DeleteOrderCommissionLinesStepInput = {
  item_ids: string[]
  shipping_method_ids: string[]
}

export const deleteOrderCommissionLinesStep = createStep(
  deleteOrderCommissionLinesStepId,
  async (
    input: DeleteOrderCommissionLinesStepInput,
    { container }
  ): Promise<StepResponse<string[], CommissionLineDTO[]>> => {
    const service = container.resolve<CommissionModuleService>(
      MercurModules.COMMISSION
    )

    const filters: Record<string, unknown>[] = []
    if (input.item_ids.length) {
      filters.push({ item_id: input.item_ids })
    }
    if (input.shipping_method_ids.length) {
      filters.push({ shipping_method_id: input.shipping_method_ids })
    }

    if (!filters.length) {
      return new StepResponse([], [])
    }

    const existing = await service.listCommissionLines({ $or: filters })
    if (!existing.length) {
      return new StepResponse([], [])
    }

    await service.deleteCommissionLines(existing.map((line) => line.id))

    return new StepResponse(
      existing.map((line) => line.id),
      existing
    )
  },
  async (previousLines, { container }) => {
    if (!previousLines?.length) {
      return
    }

    const service = container.resolve<CommissionModuleService>(
      MercurModules.COMMISSION
    )

    const restoreLines: CreateCommissionLineDTO[] = previousLines
      .filter(
        (line): line is CommissionLineDTO & { commission_rate_id: string } =>
          line.commission_rate_id !== null
      )
      .map((line) => ({
        item_id: line.item_id,
        shipping_method_id: line.shipping_method_id,
        commission_rate_id: line.commission_rate_id,
        code: line.code,
        rate: line.rate,
        amount: line.amount,
        description: line.description,
      }))

    if (restoreLines.length) {
      await service.upsertCommissionLines(restoreLines)
    }
  }
)
