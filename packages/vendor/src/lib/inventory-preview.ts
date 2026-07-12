/**
 * Echoes the variant inventory math to the seller before they confirm
 * a return / exchange / claim. The backend
 * (`mercur-confirm-return-receive`, `mercur-confirm-exchange-request`,
 * `mercur-confirm-claim-request`) already runs the same math when the
 * action is confirmed; this preview just makes it visible at the point
 * of decision so the seller knows exactly how their stock will move.
 *
 * Per variant, every `inventory_items` link row contributes
 * `quantity × required_quantity` units to the linked inventory item.
 * Bundles surface as multiple lines, one per linked inventory item.
 */

export type VariantInventoryLinkRow = {
  required_quantity?: number | null
  inventory_item_id?: string | null
  inventory?: {
    id?: string | null
    title?: string | null
    sku?: string | null
  } | null
}

export type VariantShape = {
  id?: string | null
  inventory_items?: VariantInventoryLinkRow[] | null
}

export type LineItemShape = {
  id: string
  title?: string | null
  variant_title?: string | null
  variant_sku?: string | null
  variant?: VariantShape | null
}

export type RestockPreviewRow = {
  inventoryItemId: string
  inventoryItemLabel: string
  delta: number
}

/**
 * Returns the inventory movement that will happen when `quantity` units of
 * this line item's variant are received. Returns `[]` when the variant
 * carries no inventory link or when quantity is non-positive.
 */
export const getVariantRestockPreview = (
  item: LineItemShape | null | undefined,
  quantity: number
): RestockPreviewRow[] => {
  if (!item || quantity <= 0) {
    return []
  }
  const links = item.variant?.inventory_items ?? []
  if (!links.length) {
    return []
  }

  return links
    .map<RestockPreviewRow | null>((link) => {
      const inventoryItemId = link.inventory_item_id ?? link.inventory?.id ?? null
      if (!inventoryItemId) {
        return null
      }
      const required = link.required_quantity ?? 1
      if (required <= 0) {
        return null
      }
      const label =
        link.inventory?.title ||
        link.inventory?.sku ||
        inventoryItemId
      return {
        inventoryItemId,
        inventoryItemLabel: label,
        delta: quantity * required,
      }
    })
    .filter((row): row is RestockPreviewRow => row !== null)
}
