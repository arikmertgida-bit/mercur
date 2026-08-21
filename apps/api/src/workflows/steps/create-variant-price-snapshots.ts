import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { VARIANT_PRICE_HISTORY_MODULE } from "../../modules/variant-price-history"
import VariantPriceHistoryService from "../../modules/variant-price-history/service"

export type CreateVariantPriceSnapshotInput = {
  variant_id: string
  seller_id: string
  currency_code: string
  amount: number
  captured_date: string
}

export const createVariantPriceSnapshotsStep = createStep(
  "create-variant-price-snapshots",
  async (
    data: CreateVariantPriceSnapshotInput[],
    { container }
  ) => {
    const service = container.resolve<VariantPriceHistoryService>(
      VARIANT_PRICE_HISTORY_MODULE
    )
    const created = await service.createVariantPriceSnapshots(data)
    return new StepResponse(
      created,
      created.map((snapshot) => snapshot.id)
    )
  },
  async (ids: string[] | undefined, { container }) => {
    if (!ids?.length) {
      return
    }
    const service = container.resolve<VariantPriceHistoryService>(
      VARIANT_PRICE_HISTORY_MODULE
    )
    await service.deleteVariantPriceSnapshots(ids)
  }
)
