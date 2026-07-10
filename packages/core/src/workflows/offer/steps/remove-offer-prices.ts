import { Modules } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

export type RemoveOfferPricesStepInput = string[]

type RemovedPriceSnapshot = {
  id: string
  price_set_id: string
  currency_code: string
  amount: number
  min_quantity: number | null
  max_quantity: number | null
  rules: Record<string, string>
}

export const removeOfferPricesStepId = "remove-offer-prices"

export const removeOfferPricesStep = createStep(
  removeOfferPricesStepId,
  async (ids: RemoveOfferPricesStepInput, { container }) => {
    if (!ids?.length) {
      return new StepResponse(void 0, [])
    }
    const pricingModule = container.resolve(Modules.PRICING)

    // Snapshot full price rows (incl. rules) before permanent deletion so
    // compensate can recreate them if a later workflow step fails.
    const removedPrices = await pricingModule.listPrices(
      { id: ids },
      { relations: ["price_rules"] }
    )
    const snapshots: RemovedPriceSnapshot[] = removedPrices
      .filter((price) => Boolean(price.price_set_id))
      .map((price) => ({
        id: price.id,
        price_set_id: price.price_set_id as string,
        currency_code: price.currency_code as string,
        amount: price.amount as number,
        min_quantity: (price.min_quantity as number | undefined) ?? null,
        max_quantity: (price.max_quantity as number | undefined) ?? null,
        rules: Object.fromEntries(
          (price.price_rules ?? []).map((rule) => [rule.attribute, rule.value])
        ),
      }))

    await pricingModule.removePrices(ids)
    return new StepResponse(void 0, snapshots)
  },
  async (snapshots: RemovedPriceSnapshot[] | undefined, { container }) => {
    if (!snapshots?.length) {
      return
    }
    const pricingModule = container.resolve(Modules.PRICING)

    const byPriceSet = new Map<string, RemovedPriceSnapshot[]>()
    for (const snapshot of snapshots) {
      const group = byPriceSet.get(snapshot.price_set_id) ?? []
      group.push(snapshot)
      byPriceSet.set(snapshot.price_set_id, group)
    }

    for (const [priceSetId, prices] of byPriceSet) {
      await pricingModule.updatePriceSets(
        { id: [priceSetId] },
        {
          prices: prices.map((price) => ({
            id: price.id,
            currency_code: price.currency_code,
            amount: price.amount,
            min_quantity: price.min_quantity ?? undefined,
            max_quantity: price.max_quantity ?? undefined,
            rules: price.rules,
          })),
        }
      )
    }
  }
)
