import {
  calculateAmountsWithTax,
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import type {
  CalculatedPriceSet,
  ItemTaxLineDTO,
  MedusaContainer,
  MedusaPricingContext,
  TaxableItemDTO,
  TaxCalculationContext,
} from "@medusajs/framework/types"

/**
 * `wrapProductVariantsWithCalculatedPrice`/`wrapVariantsWithTaxPrices` only ever read
 * `scope`/`pricingContext`/`taxContext` off the request, so this is intentionally
 * narrower than a full `MedusaStoreRequest` — real HTTP routes pass their (wider)
 * request object, which satisfies this structurally, and batch callers (e.g.
 * `search/lib/build-docs.ts`) that have no real HTTP request can build a plain
 * object matching this shape instead of forcing a request through a wide cast.
 */
type StoreRequestWithContext = {
  scope: MedusaContainer
  pricingContext?: MedusaPricingContext
  taxContext?: {
    taxLineContext?: TaxCalculationContext
    taxInclusivityContext?: { automaticTaxes: boolean }
  }
}

type VariantPriceSetRow = {
  id: string
  price_set?: { id?: string } | null
}

// `calculateAmountsWithTax` results are bolted onto the price set after the fact
// for the storefront — Medusa's own `CalculatedPriceSet` DTO has no tax-adjusted
// amount fields, since tax calculation isn't part of the pricing module.
export type CalculatedPriceWithTax = CalculatedPriceSet & {
  calculated_amount_with_tax?: number
  calculated_amount_without_tax?: number
  original_amount_with_tax?: number
  original_amount_without_tax?: number
}

type PriceableVariant = {
  id: string
  calculated_price?: CalculatedPriceWithTax | null
}

type PriceableProduct = {
  id?: string
  variants?: PriceableVariant[] | null
}

/**
 * Sets each variant's `calculated_price` in place from its own price set,
 * using Medusa's standard pricing module (region_id/currency_code context —
 * no seller/offer scoping). No-ops without a pricing context (caller did not
 * request calculated prices).
 */
export const wrapProductVariantsWithCalculatedPrice = async (
  req: StoreRequestWithContext,
  products: PriceableProduct[]
): Promise<void> => {
  if (!req.pricingContext) {
    return
  }

  const variantIds = Array.from(
    new Set(products.flatMap((p) => (p.variants ?? []).map((v) => v.id)))
  )
  if (!variantIds.length) {
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "price_set.id"],
    filters: { id: variantIds },
  })

  const priceSetToVariant = new Map<string, string>()
  const priceSetIds = new Set<string>()
  for (const variant of variants as VariantPriceSetRow[]) {
    const priceSetId = variant.price_set?.id
    if (!priceSetId) {
      continue
    }
    priceSetIds.add(priceSetId)
    priceSetToVariant.set(priceSetId, variant.id)
  }
  if (!priceSetIds.size) {
    return
  }

  const pricingModule = req.scope.resolve(Modules.PRICING)
  const calculated = await pricingModule.calculatePrices(
    { id: Array.from(priceSetIds) },
    { context: req.pricingContext as Record<string, string | number> }
  )

  const byVariant = new Map<string, CalculatedPriceSet>()
  for (const calc of calculated) {
    const variantId = priceSetToVariant.get(calc.id)
    if (!variantId) {
      continue
    }
    byVariant.set(variantId, calc)
  }

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      variant.calculated_price = byVariant.get(variant.id) ?? null
    }
  }

  await wrapVariantsWithTaxPrices(req, products)
}

/**
 * Adds tax-inclusive / tax-exclusive amounts onto each variant's
 * `calculated_price`, gated on automatic taxes being enabled.
 */
const wrapVariantsWithTaxPrices = async (
  req: StoreRequestWithContext,
  products: PriceableProduct[]
): Promise<void> => {
  if (
    !req.taxContext?.taxInclusivityContext ||
    !req.taxContext?.taxLineContext ||
    !req.taxContext.taxInclusivityContext.automaticTaxes
  ) {
    return
  }

  const items: TaxableItemDTO[] = []
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      const price = variant.calculated_price
      if (!price || !product.id || price.calculated_amount == null) {
        continue
      }
      items.push({
        id: variant.id,
        product_id: product.id,
        quantity: 1,
        unit_price: Number(price.calculated_amount),
        currency_code: price.currency_code,
      } as TaxableItemDTO)
    }
  }
  if (!items.length) {
    return
  }

  const taxService = req.scope.resolve(Modules.TAX)
  const taxLines = await taxService.getTaxLines(
    items,
    req.taxContext.taxLineContext
  )

  const taxRatesMap = new Map<string, ItemTaxLineDTO[]>()
  for (const taxLine of taxLines) {
    if (!("line_item_id" in taxLine)) {
      continue
    }
    const existing = taxRatesMap.get(taxLine.line_item_id) ?? []
    existing.push(taxLine)
    taxRatesMap.set(taxLine.line_item_id, existing)
  }

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      const price = variant.calculated_price
      if (!price || price.calculated_amount == null) {
        continue
      }

      const taxRatesForVariant = taxRatesMap.get(variant.id) || []

      const { priceWithTax, priceWithoutTax } = calculateAmountsWithTax({
        taxLines: taxRatesForVariant,
        amount: Number(price.calculated_amount),
        includesTax: price.is_calculated_price_tax_inclusive,
      })
      price.calculated_amount_with_tax = priceWithTax
      price.calculated_amount_without_tax = priceWithoutTax

      if (price.original_amount == null) {
        continue
      }
      const {
        priceWithTax: originalPriceWithTax,
        priceWithoutTax: originalPriceWithoutTax,
      } = calculateAmountsWithTax({
        taxLines: taxRatesForVariant,
        amount: Number(price.original_amount),
        includesTax: price.is_original_price_tax_inclusive,
      })
      price.original_amount_with_tax = originalPriceWithTax
      price.original_amount_without_tax = originalPriceWithoutTax
    }
  }
}
