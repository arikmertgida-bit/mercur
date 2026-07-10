import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import {
  CommissionLineDTO,
  CreateCommissionLineDTO,
  MercurModules,
} from "@mercurjs/types"

import CommissionModuleService from "../../../modules/commission/service"

type UpsertCommissionLinesStepInput = {
  commission_lines: CreateCommissionLineDTO[]
}

type UpsertCommissionLinesCompensateInput = {
  newIds: string[]
  previousLines: CommissionLineDTO[]
}

export const upsertCommissionLinesStepId = "upsert-commission-lines"

export const upsertCommissionLinesStep = createStep(
  upsertCommissionLinesStepId,
  async (input: UpsertCommissionLinesStepInput, { container }) => {
    const service = container.resolve<CommissionModuleService>(
      MercurModules.COMMISSION
    )

    // upsertCommissionLines() deletes-then-recreates any line matching the
    // same item/shipping-method id — snapshot that prior state so compensate
    // can restore it if a later workflow step fails.
    const itemIds = input.commission_lines
      .map((line) => line.item_id)
      .filter((id): id is string => !!id)
    const shippingMethodIds = input.commission_lines
      .map((line) => line.shipping_method_id)
      .filter((id): id is string => !!id)

    const filters: Array<
      { item_id: string[] } | { shipping_method_id: string[] }
    > = []
    if (itemIds.length) {
      filters.push({ item_id: itemIds })
    }
    if (shippingMethodIds.length) {
      filters.push({ shipping_method_id: shippingMethodIds })
    }

    const previousLines = filters.length
      ? await service.listCommissionLines({ $or: filters })
      : []

    const commissionLines = await service.upsertCommissionLines(
      input.commission_lines
    )

    return new StepResponse(commissionLines, {
      newIds: commissionLines.map((line) => line.id),
      previousLines,
    })
  },
  async (
    compensateInput: UpsertCommissionLinesCompensateInput | undefined,
    { container }
  ) => {
    if (!compensateInput) {
      return
    }

    const service = container.resolve<CommissionModuleService>(
      MercurModules.COMMISSION
    )
    const { newIds, previousLines } = compensateInput

    if (newIds.length) {
      await service.deleteCommissionLines(newIds)
    }

    const restoreLines: CreateCommissionLineDTO[] = previousLines
      .filter((line): line is CommissionLineDTO & { commission_rate_id: string } =>
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
