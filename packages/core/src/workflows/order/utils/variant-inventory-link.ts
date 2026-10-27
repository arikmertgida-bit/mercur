import { z } from "zod"

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

const VariantInventoryItemRowSchema = z.object({
  inventory_item_id: z.string().nullish(),
  required_quantity: z.number().nullish(),
  inventory: z
    .object({
      id: z.string(),
      title: z.string().nullish(),
      sku: z.string().nullish(),
      location_levels: z
        .array(z.object({ location_id: z.string() }))
        .nullish(),
    })
    .nullish(),
})

/** A `product_variant` row with its `inventory_items` link selected. */
export const VariantInventoryRowSchema = z.object({
  id: z.string(),
  inventory_items: z.array(VariantInventoryItemRowSchema).nullish(),
})

export type VariantInventoryRow = z.infer<typeof VariantInventoryRowSchema>

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
