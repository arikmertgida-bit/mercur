import {
  DeleteResponse,
  HttpTypes,
  InventoryLevelDTO,
  PaginatedResponse,
} from "@medusajs/types"
import { ProductVariantDTO } from "../product/common"

// The vendor inventory routes serialize the same item graph the admin routes
// do (location levels with stocked/reserved/available quantities, string
// dates), so the wire shape is Medusa's HTTP inventory item — not the
// module DTOs. The detail query also expands the linked variants.
export type VendorInventoryItem = HttpTypes.AdminInventoryItem & {
  variants?: ProductVariantDTO[] | null
}

// The location-levels list can expand the linked stock locations.
export type VendorInventoryLevel = HttpTypes.AdminInventoryLevel & {
  stock_locations?: HttpTypes.AdminStockLocation[]
}

export type VendorInventoryItemResponse = {
  inventory_item: VendorInventoryItem
}

export type VendorInventoryItemListResponse = PaginatedResponse<{
  inventory_items: VendorInventoryItem[]
}>

export type VendorInventoryItemDeleteResponse = DeleteResponse<"inventory_item">

export type VendorInventoryLevelListResponse = PaginatedResponse<{
  inventory_levels: VendorInventoryLevel[]
}>

export type VendorInventoryLevelDeleteResponse = {
  id: string
  object: "inventory-level"
  deleted: true
  parent: VendorInventoryItem
}

export type VendorBatchInventoryItemLevelResponse = {
  created: InventoryLevelDTO[]
  updated: InventoryLevelDTO[]
  deleted: string[]
}
