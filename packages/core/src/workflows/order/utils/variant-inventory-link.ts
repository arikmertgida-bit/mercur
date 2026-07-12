// Mirrors `workflows/cart/utils/prepare-variant-inventory-input.ts`'s field
// convention: a `product_variant`'s own `inventory_items` link (not a
// per-seller/offer indirection) is the single source of truth for which
// inventory item(s) a line item's reservations/fulfillments move.
export type VariantInventoryLink = {
  inventory_item_id: string
  required_quantity: number
  inventory?: {
    id: string
    title?: string | null
    sku?: string | null
    location_levels?: { location_id: string }[] | null
  } | null
}

type VariantInventoryItemRow = {
  inventory_item_id?: string | null
  required_quantity?: number | null
  inventory?: {
    id: string
    title?: string | null
    sku?: string | null
    location_levels?: { location_id: string }[] | null
  } | null
}

export type VariantInventoryRow = {
  id: string
  inventory_items?: VariantInventoryItemRow[] | null
}

export const buildVariantInventoryLinkMap = (
  variants: VariantInventoryRow[]
): Record<string, Record<string, VariantInventoryLink>> => {
  const byVariant: Record<string, Record<string, VariantInventoryLink>> = {}

  for (const variant of variants) {
    const byInventoryItem: Record<string, VariantInventoryLink> =
      byVariant[variant.id] ?? {}

    for (const link of variant.inventory_items ?? []) {
      const inventoryItemId = link.inventory_item_id ?? link.inventory?.id
      if (!inventoryItemId) continue

      byInventoryItem[inventoryItemId] = {
        inventory_item_id: inventoryItemId,
        required_quantity: link.required_quantity ?? 1,
        inventory: link.inventory
          ? {
              id: link.inventory.id,
              title: link.inventory.title ?? null,
              sku: link.inventory.sku ?? null,
              location_levels: link.inventory.location_levels ?? null,
            }
          : null,
      }
    }

    byVariant[variant.id] = byInventoryItem
  }

  return byVariant
}
