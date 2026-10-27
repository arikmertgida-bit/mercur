import type {
  HttpTypes,
  PriceDTO,
  PriceListDTO,
} from "@medusajs/framework/types"

/** A price-list price as query returns it, reached through its price set. */
export type PriceListGraphPrice = PriceDTO & {
  price_set?: PriceDTO["price_set"] & { variant?: { id: string } | null }
}

/** A price as the price-list routes return it: flat rules and a variant id. */
export type PriceListCorePrice = Omit<
  PriceListGraphPrice,
  "price_rules" | "price_set"
> & {
  variant_id?: string
  rules?: Record<string, string>
}

/** A price list with its rules and prices flattened the way Medusa's admin routes send them. */
export type TransformedPriceList<T> = Omit<T, "price_list_rules" | "prices"> & {
  rules?: Record<string, string[]>
  prices?: PriceListCorePrice[]
}

/**
 * The vendor price-list routes send the price list query returns, flattened
 * like Medusa's admin price-list routes do (`buildPriceListRules` /
 * `buildPriceSetRules`), and their response contract is Medusa's HTTP price
 * list. The module DTO and the HTTP type are parallel hierarchies that do not
 * structurally unify (Date vs serialized dates, timestamps the DTO leaves
 * out although the routes select them), while the serialized object is
 * exactly the HTTP shape. This function is that boundary.
 */
export const toHttpPriceList = (
  priceList: TransformedPriceList<PriceListDTO>
): HttpTypes.AdminPriceList => {
  // @ts-expect-error — Medusa boundary: flattened module `PriceListDTO` →
  // HTTP `AdminPriceList` (same serialized object; see the comment above).
  return priceList
}
