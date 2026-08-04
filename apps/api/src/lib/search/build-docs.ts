import { MedusaContainer } from '@medusajs/framework/types'
import {
  CalculatedPriceWithTax,
  wrapProductVariantsWithCalculatedPrice,
} from '@mercurjs/core/api/utils/product-pricing'

import {
  ActiveProductPromotion,
  matchProductPromotions,
  PromotionMatchableProduct,
} from './promotion-index'
import { SearchDoc, SearchDocAttribute, SearchDocPrice } from './types'

export type SearchRegion = {
  id: string
  currency_code: string
  automatic_taxes?: boolean
  countries?: { iso_2?: string | null }[] | null
}

type ProductVariantRow = {
  id: string
  calculated_price?: CalculatedPriceWithTax | null
}

type ProductAttributeValueRow = {
  id: string
  name: string
  attribute?: {
    id: string
    handle?: string | null
    name?: string | null
    type?: string | null
    is_filterable?: boolean | null
  } | null
}

type ProductSellerRow = {
  id: string
  handle?: string | null
  status?: string | null
  is_premium?: boolean | null
  closed_from?: string | Date | null
  closed_to?: string | Date | null
}

export type InventoryLocationLevelRow = {
  stocked_quantity?: number | null
  reserved_quantity?: number | null
  stock_locations?: { sales_channels?: { id: string }[] | null }[] | null
}

export type ProductVariantInventoryRow = ProductVariantRow & {
  manage_inventory?: boolean | null
  inventory_items?:
    | {
        inventory?: { location_levels?: InventoryLocationLevelRow[] | null } | null
      }[]
    | null
}

export type SearchProductRow = {
  id: string
  title: string
  description?: string | null
  handle?: string | null
  thumbnail?: string | null
  status?: string | null
  created_at?: string | Date | null
  collection_id?: string | null
  collection?: { id?: string; title?: string | null } | null
  categories?: { id: string; name?: string | null }[] | null
  type_id?: string | null
  tags?: { id: string }[] | null
  variants?: ProductVariantInventoryRow[] | null
  product_attribute_values?: ProductAttributeValueRow[] | null
  sellers?: ProductSellerRow[] | null
}

// Curated list — never `+`-prefixed on a default product list, which 500s
// ("Cannot resolve alias path").
export const searchProductFields = [
  'id',
  'title',
  'description',
  'handle',
  'thumbnail',
  'status',
  'created_at',
  'collection_id',
  'collection.id',
  'collection.title',
  'categories.id',
  'categories.name',
  'type_id',
  'tags.id',
  'variants.id',
  'variants.manage_inventory',
  'variants.inventory_items.inventory.location_levels.stocked_quantity',
  'variants.inventory_items.inventory.location_levels.reserved_quantity',
  'variants.inventory_items.inventory.location_levels.stock_locations.sales_channels.id',
  'product_attribute_values.id',
  'product_attribute_values.name',
  'product_attribute_values.attribute.id',
  'product_attribute_values.attribute.handle',
  'product_attribute_values.attribute.name',
  'product_attribute_values.attribute.type',
  'product_attribute_values.attribute.is_filterable',
  'sellers.id',
  'sellers.handle',
  'sellers.status',
  'sellers.is_premium',
  'sellers.closed_from',
  'sellers.closed_to',
]

// Meilisearch has no notion of "now" — a closure window's start/end can't
// trigger a reindex (no action/event fires when time simply passes), so the
// window is encoded as two static epoch-ms timestamps and re-evaluated
// against the *query-time* clock in meilisearch-client.ts on every request
// instead. `NEVER_CLOSED_TS` stands in for a null closed_from/closed_to so
// the encoding stays purely numeric (Meilisearch range filters, no `IS
// NULL`): a null `closed_from` must always compare as "in the future" (never
// started) and a null `closed_to` must always compare as "not yet ended"
// (an open-ended closure stays closed indefinitely) — both are satisfied by
// the same distant-future sentinel. This must stay the exact numeric twin of
// `buildSellerOutsideClosureWindowFilter` in
// `packages/core/src/api/utils/sellers.ts`.
export const NEVER_CLOSED_TS = Number(new Date('9999-01-01T00:00:00.000Z'))

const closureTimestamp = (value: string | Date | null | undefined): number =>
  value ? new Date(value).getTime() : NEVER_CLOSED_TS

const buildRegionTaxContext = (region: SearchRegion) => {
  if (!region.automatic_taxes) {
    return { taxInclusivityContext: { automaticTaxes: false } }
  }
  const countryCode = (region.countries ?? [])
    .map((c) => c?.iso_2)
    .find((iso): iso is string => Boolean(iso))
  return {
    taxInclusivityContext: { automaticTaxes: true },
    taxLineContext: countryCode
      ? { address: { country_code: countryCode } }
      : undefined,
  }
}

const fakeReq = (
  container: MedusaContainer,
  region: SearchRegion
): Parameters<typeof wrapProductVariantsWithCalculatedPrice>[0] => ({
  scope: container,
  pricingContext: {
    region_id: region.id,
    currency_code: region.currency_code,
  },
  taxContext: buildRegionTaxContext(region),
})

const toPrice = (cp: CalculatedPriceWithTax): SearchDocPrice | undefined => {
  const calculated = cp.calculated_amount_with_tax ?? cp.calculated_amount
  if (calculated == null) {
    return undefined
  }
  const original = cp.original_amount_with_tax ?? cp.original_amount ?? calculated
  return {
    calculated_amount: Number(calculated),
    original_amount: Number(original),
    currency_code: cp.currency_code ?? '',
  }
}

const cheapestVariantPrice = (
  product: SearchProductRow
): SearchDocPrice | undefined => {
  let best: SearchDocPrice | undefined
  for (const variant of product.variants ?? []) {
    if (!variant.calculated_price) {
      continue
    }
    const price = toPrice(variant.calculated_price)
    if (price && (!best || price.calculated_amount < best.calculated_amount)) {
      best = price
    }
  }
  return best
}

const buildAttributes = (
  product: SearchProductRow
): { tokens: string[]; attributes: SearchDocAttribute[] } => {
  const byAttribute = new Map<string, SearchDocAttribute>()
  const tokens: string[] = []

  for (const pav of product.product_attribute_values ?? []) {
    const attribute = pav.attribute
    if (!attribute?.is_filterable) {
      continue
    }
    const handle = attribute.handle ?? attribute.id
    tokens.push(`attr:${handle}:${pav.id}`)

    const existing = byAttribute.get(attribute.id) ?? {
      id: attribute.id,
      handle,
      name: attribute.name ?? handle,
      type: attribute.type ?? 'text',
      values: [],
    }
    existing.values.push({ id: pav.id, name: pav.name })
    byAttribute.set(attribute.id, existing)
  }

  return { tokens, attributes: [...byAttribute.values()] }
}

// A product stays discoverable if at least one of its variants is
// purchasable — either untracked (`manage_inventory: false`, always
// available) or has positive available stock (stocked - reserved) at a
// location linked to the store's default sales channel. One dead variant
// doesn't hide a product whose other variants still sell.
const isVariantInStock = (
  variant: ProductVariantInventoryRow,
  defaultSalesChannelId: string | null
): boolean => {
  if (variant.manage_inventory === false) {
    return true
  }

  if (!defaultSalesChannelId) {
    return true
  }

  return (variant.inventory_items ?? []).some((item) =>
    (item.inventory?.location_levels ?? []).some((level) => {
      const isLinkedToDefaultChannel = (level.stock_locations ?? []).some(
        (location) =>
          (location.sales_channels ?? []).some(
            (channel) => channel.id === defaultSalesChannelId
          )
      )
      if (!isLinkedToDefaultChannel) {
        return false
      }
      const available = (level.stocked_quantity ?? 0) - (level.reserved_quantity ?? 0)
      return available > 0
    })
  )
}

const resolveInStock = (
  product: SearchProductRow,
  defaultSalesChannelId: string | null
): boolean =>
  (product.variants ?? []).some((variant) =>
    isVariantInStock(variant, defaultSalesChannelId)
  )

// Per-region buybox comes from the store price helper via a faked request (no
// HTTP) so the stored number matches `/store/products`.
export const buildProductDocs = async (
  container: MedusaContainer,
  products: SearchProductRow[],
  regions: SearchRegion[],
  defaultSalesChannelId: string | null,
  activePromotions: ActiveProductPromotion[] = []
): Promise<{
  docs: SearchDoc[]
  attributesByProduct: Map<
    string,
    { tokens: string[]; attributes: SearchDocAttribute[] }
  >
}> => {
  if (!products.length) {
    return { docs: [], attributesByProduct: new Map() }
  }

  const pricesByProduct = new Map<string, Record<string, SearchDocPrice>>()
  for (const region of regions) {
    await wrapProductVariantsWithCalculatedPrice(fakeReq(container, region), products)
    for (const product of products) {
      const price = cheapestVariantPrice(product)
      if (!price) {
        continue
      }
      const map = pricesByProduct.get(product.id) ?? {}
      map[region.id] = price
      pricesByProduct.set(product.id, map)
    }
  }

  const attributesByProduct = new Map<
    string,
    { tokens: string[]; attributes: SearchDocAttribute[] }
  >()
  const docs: SearchDoc[] = products.map((product) => {
    const attrs = buildAttributes(product)
    attributesByProduct.set(product.id, attrs)
    const seller = (product.sellers ?? [])[0]

    const matchableProduct: PromotionMatchableProduct = {
      id: product.id,
      category_ids: (product.categories ?? []).map((c) => c.id),
      collection_id: product.collection?.id ?? product.collection_id ?? null,
      type_id: product.type_id ?? null,
      tag_ids: (product.tags ?? []).map((t) => t.id),
    }
    const { promotion_types, campaign_ids } = matchProductPromotions(
      matchableProduct,
      activePromotions
    )

    return {
      id: product.id,
      type: 'product',
      title: product.title,
      description: product.description ?? undefined,
      handle: product.handle ?? undefined,
      thumbnail: product.thumbnail ?? undefined,
      created_at: product.created_at
        ? new Date(product.created_at).toISOString()
        : undefined,
      seller_id: seller?.id ?? undefined,
      seller_handle: seller?.handle ?? undefined,
      seller_status: seller?.status ?? undefined,
      seller_closed_from_ts: closureTimestamp(seller?.closed_from),
      seller_closed_to_ts: closureTimestamp(seller?.closed_to),
      // Drives the `seller_is_premium` custom ranking rule — always a concrete
      // boolean (never left `undefined`) so Meilisearch has a stable value to
      // rank on for every document, including sellers that never opted in.
      seller_is_premium: seller?.is_premium ?? false,
      collection_id: product.collection?.id ?? product.collection_id ?? undefined,
      collection: product.collection?.title ?? undefined,
      category_ids: (product.categories ?? []).map((c) => c.id),
      // Kept index-aligned with `category_ids` so the route can join id → label.
      categories: (product.categories ?? []).map((c) => c.name ?? c.id),
      attribute_tokens: attrs.tokens,
      attributes: attrs.attributes,
      prices: pricesByProduct.get(product.id) ?? {},
      in_stock: resolveInStock(product, defaultSalesChannelId),
      promotion_types,
      campaign_ids,
    }
  })

  return { docs, attributesByProduct }
}
