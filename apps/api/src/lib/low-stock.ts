import type { Query } from "@medusajs/framework"

import { InventoryItemSellerLinkRowSchema, parseRows } from "./graph-schemas"

// Shared with apps/api/src/jobs/compute-seller-analytics.ts (the 12h batch
// snapshot) and apps/api/src/subscribers/inventory-level-changed-low-stock.ts
// (the instant per-item update) so both agree on what "low stock" means.
// An item is flagged once its available quantity drops strictly below this
// value (available < LOW_STOCK_THRESHOLD) — see the comparisons below.
export const LOW_STOCK_THRESHOLD = 10
export const PUBLISHED_PRODUCT_STATUS = "published"

type InventoryItemLocationLevel = {
  stocked_quantity: number
  reserved_quantity: number
}

type InventoryItemVariant = {
  product?: { status?: string | null; thumbnail?: string | null } | null
}

export function computeAvailableQuantity(
  locationLevels: InventoryItemLocationLevel[] | null | undefined
): number {
  return (locationLevels ?? []).reduce(
    (sum, level) => sum + (level.stocked_quantity - level.reserved_quantity),
    0
  )
}

// An inventory item still attached to a draft/proposed/rejected product
// isn't actually sellable on the marketplace yet, so it shouldn't nag the
// seller/admin with a "stock running low" reminder meant for live listings.
// Only flag it once at least one of its variants belongs to a published
// product.
export function hasPublishedListing(
  variants: InventoryItemVariant[] | null | undefined
): boolean {
  return (variants ?? []).some(
    (variant) => variant.product?.status === PUBLISHED_PRODUCT_STATUS
  )
}

// An inventory item can in principle be shared by several variants/products
// — picks the first one that actually has a thumbnail, so the widget still
// shows an image even if one linked product happens to be missing one.
export function resolveThumbnail(
  variants: InventoryItemVariant[] | null | undefined
): string | null {
  for (const variant of variants ?? []) {
    if (variant.product?.thumbnail) {
      return variant.product.thumbnail
    }
  }
  return null
}

export type LowStockEvaluation = {
  seller_id: string
  inventory_item_id: string
  product_title: string
  sku: string | null
  thumbnail: string | null
  available_quantity: number
  is_low_stock: boolean
}

// Evaluates the current low-stock status of specific inventory items (by
// id), one row per (seller, inventory item) pair — used by the
// inventory_level.changed subscriber to react to a single item's stock
// change without rescanning a seller's whole catalog (see
// apps/api/src/jobs/compute-seller-analytics.ts for the bulk, per-seller
// equivalent used by the scheduled snapshot).
export async function evaluateLowStockForInventoryItems(
  query: Query,
  inventoryItemIds: string[]
): Promise<LowStockEvaluation[]> {
  if (inventoryItemIds.length === 0) {
    return []
  }

  const { data: rows } = await query.graph({
    entity: "inventory_item_seller",
    fields: [
      "seller_id",
      "inventory_item.id",
      "inventory_item.sku",
      "inventory_item.title",
      "inventory_item.location_levels.stocked_quantity",
      "inventory_item.location_levels.reserved_quantity",
      "inventory_item.variants.product.status",
      "inventory_item.variants.product.thumbnail",
    ],
    filters: { inventory_item_id: inventoryItemIds },
  })

  const links = parseRows(InventoryItemSellerLinkRowSchema, rows as object[])

  return links.flatMap((link) => {
    const item = link.inventory_item
    if (!item) {
      return []
    }

    const availableQuantity = computeAvailableQuantity(item.location_levels)
    const isLowStock =
      hasPublishedListing(item.variants) && availableQuantity < LOW_STOCK_THRESHOLD

    return [
      {
        seller_id: link.seller_id,
        inventory_item_id: item.id,
        product_title: item.title ?? item.sku ?? item.id,
        sku: item.sku ?? null,
        thumbnail: resolveThumbnail(item.variants),
        available_quantity: availableQuantity,
        is_low_stock: isLowStock,
      },
    ]
  })
}
