import { BigNumberInput } from "@medusajs/framework/types"
import { BigNumber, MathBN, MedusaError } from "@medusajs/framework/utils"

// Mirrors vanilla Medusa's own (internal, non-exported)
// `prepareConfirmInventoryInput` from `@medusajs/core-flows` — ported here so
// order-splitting can reserve inventory straight off each line item's own
// variant, with no seller/offer indirection.
export const requiredVariantFieldsForInventoryConfirmation = [
  "id",
  "manage_inventory",
  "allow_backorder",
  "inventory_items.inventory_item_id",
  "inventory_items.required_quantity",
  "inventory_items.inventory.location_levels.stocked_quantity",
  "inventory_items.inventory.location_levels.reserved_quantity",
  "inventory_items.inventory.location_levels.raw_stocked_quantity",
  "inventory_items.inventory.location_levels.raw_reserved_quantity",
  "inventory_items.inventory.location_levels.location_id",
  "inventory_items.inventory.location_levels.stock_locations.id",
  "inventory_items.inventory.location_levels.stock_locations.sales_channels.id",
]

type VariantInventoryItemLinkRow = {
  inventory_item_id?: string | null
  required_quantity?: number | null
  inventory?: {
    location_levels?: Array<{
      location_id: string
      stocked_quantity?: BigNumberInput
      reserved_quantity?: BigNumberInput
      raw_stocked_quantity?: BigNumberInput
      raw_reserved_quantity?: BigNumberInput
      stock_locations?: Array<{
        id: string
        sales_channels?: Array<{ id: string }>
      }> | null
    }> | null
  } | null
}

export type VariantInventoryShape = {
  id: string
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  inventory_items?: VariantInventoryItemLinkRow[] | null
}

export type PrepareVariantInventoryInputData = {
  input: {
    sales_channel_id?: string
    items: Array<{
      id?: string
      quantity: BigNumberInput
      variant_id?: string | null
    }>
    variants: VariantInventoryShape[]
  }
}

export type VariantConfirmInventoryItem = {
  id?: string
  inventory_item_id: string
  required_quantity: number
  allow_backorder: boolean
  quantity: BigNumberInput
  location_ids: string[]
}

type VariantInventoryItemEntry = {
  variant_id: string
  inventory_item_id: string
  required_quantity: number
}

export const prepareVariantInventoryInput = (
  data: PrepareVariantInventoryInputData
): { items: VariantConfirmInventoryItem[] } => {
  const { sales_channel_id, items, variants } = data.input

  if (!items.length) {
    return { items: [] }
  }

  const variantById = new Map<string, VariantInventoryShape>(
    variants.map((v) => [v.id, v])
  )

  const variantInventoryItems = new Map<string, VariantInventoryItemEntry>()
  const mapLocationAvailability = new Map<string, Map<string, BigNumber>>()
  const stockLocationIds = new Set<string>()
  const variantsWithLocationForChannel = new Set<string>()
  let hasManagedInventory = false

  for (const variant of variants) {
    if (variant.manage_inventory) {
      hasManagedInventory = true
    }

    for (const link of variant.inventory_items ?? []) {
      const inventoryItemId = link.inventory_item_id
      if (!inventoryItemId) {
        continue
      }

      const mapKey = `${inventoryItemId}-${variant.id}`
      if (!variantInventoryItems.has(mapKey)) {
        variantInventoryItems.set(mapKey, {
          variant_id: variant.id,
          inventory_item_id: inventoryItemId,
          required_quantity: link.required_quantity ?? 1,
        })
      }

      for (const level of link.inventory?.location_levels ?? []) {
        const availability = MathBN.sub(
          level.raw_stocked_quantity ?? level.stocked_quantity ?? 0,
          level.raw_reserved_quantity ?? level.reserved_quantity ?? 0
        )

        if (!mapLocationAvailability.has(level.location_id)) {
          mapLocationAvailability.set(level.location_id, new Map())
        }
        mapLocationAvailability
          .get(level.location_id)!
          .set(inventoryItemId, new BigNumber(availability))

        for (const stockLocation of level.stock_locations ?? []) {
          if (
            sales_channel_id &&
            stockLocation.sales_channels?.some(
              (sc) => sc.id === sales_channel_id
            )
          ) {
            variantsWithLocationForChannel.add(variant.id)
            stockLocationIds.add(stockLocation.id)
          }
        }
      }
    }
  }

  if (!hasManagedInventory) {
    return { items: [] }
  }

  if (sales_channel_id) {
    for (const variant of variants) {
      if (
        variant.manage_inventory &&
        !variantsWithLocationForChannel.has(variant.id) &&
        !variant.allow_backorder
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Sales channel ${sales_channel_id} is not associated with any stock location for variant ${variant.id}.`
        )
      }
    }
  }

  const locationIds = Array.from(stockLocationIds)
  const result: VariantConfirmInventoryItem[] = []

  for (const item of items) {
    const variantId = item.variant_id
    if (!variantId) {
      continue
    }

    const variant = variantById.get(variantId)
    if (!variant?.manage_inventory) {
      continue
    }

    const itemsForVariant = Array.from(variantInventoryItems.values()).filter(
      (entry) => entry.variant_id === variantId
    )
    if (!itemsForVariant.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Variant ${variantId} does not have any inventory items associated with it.`
      )
    }

    for (const entry of itemsForVariant) {
      const required = MathBN.mult(entry.required_quantity, item.quantity)

      const locationsWithAvailability = locationIds.filter((locId) =>
        MathBN.gte(
          mapLocationAvailability.get(locId)?.get(entry.inventory_item_id) ??
            0,
          required
        )
      )
      const locationsWithLevel = locationIds.filter((locId) =>
        mapLocationAvailability.get(locId)?.has(entry.inventory_item_id)
      )

      result.push({
        id: item.id,
        inventory_item_id: entry.inventory_item_id,
        required_quantity: entry.required_quantity,
        allow_backorder: !!variant.allow_backorder,
        quantity: item.quantity,
        location_ids: locationsWithAvailability.length
          ? locationsWithAvailability
          : locationsWithLevel.length
            ? locationsWithLevel
            : locationIds,
      })
    }
  }

  return { items: result }
}
