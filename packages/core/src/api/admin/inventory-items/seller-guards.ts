import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "zod"

import {
  PRODUCT_INVENTORY_ITEM_NOT_SELLER_CODE,
  PRODUCT_STOCK_LOCATION_NOT_SELLER_CODE,
} from "../../utils/admin-error-codes"
import { parseGraphRows } from "../../../utils/graph-rows"

// An inventory item belongs to the store of its product (inventory_item_seller)
// and is stocked only in that store's own locations (stock_location_seller).
// Medusa's native admin inventory routes know nothing about stores, so these
// guards run after their body validation. An item or location without a store
// only pairs with another one without a store.

const InventoryItemSellerRowSchema = z.object({
  inventory_item_id: z.string(),
  seller_id: z.string(),
})
const StockLocationSellerRowSchema = z.object({
  stock_location_id: z.string(),
  seller_id: z.string(),
})
const VariantSellerRowSchema = z.object({
  id: z.string(),
  product: z
    .object({
      sellers: z.array(z.object({ id: z.string() }).nullable()).nullish(),
    })
    .nullish(),
})

type LocationLevel = { inventory_item_id: string | null; location_id: string }
type VariantInventoryItem = { variant_id: string; inventory_item_id: string }

const unique = (ids: string[]): string[] => Array.from(new Set(ids))

const getInventoryItemSellers = async (
  scope: MedusaContainer,
  inventoryItemIds: string[]
): Promise<Map<string, string>> => {
  const ids = unique(inventoryItemIds)
  if (!ids.length) {
    return new Map()
  }
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "inventory_item_seller",
    fields: ["inventory_item_id", "seller_id"],
    filters: { inventory_item_id: ids },
  })
  return new Map(
    parseGraphRows(InventoryItemSellerRowSchema, data).map((row) => [
      row.inventory_item_id,
      row.seller_id,
    ])
  )
}

const getStockLocationSellers = async (
  scope: MedusaContainer,
  stockLocationIds: string[]
): Promise<Map<string, string>> => {
  const ids = unique(stockLocationIds)
  if (!ids.length) {
    return new Map()
  }
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "stock_location_seller",
    fields: ["stock_location_id", "seller_id"],
    filters: { stock_location_id: ids },
  })
  return new Map(
    parseGraphRows(StockLocationSellerRowSchema, data).map((row) => [
      row.stock_location_id,
      row.seller_id,
    ])
  )
}

const getVariantSellers = async (
  scope: MedusaContainer,
  variantIds: string[]
): Promise<Map<string, string | null>> => {
  const ids = unique(variantIds)
  if (!ids.length) {
    return new Map()
  }
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product.sellers.id"],
    filters: { id: ids },
  })
  return new Map(
    parseGraphRows(VariantSellerRowSchema, data).map((row) => {
      const [seller] = (row.product?.sellers ?? []).flatMap((s) =>
        s ? [s.id] : []
      )
      return [row.id, seller ?? null]
    })
  )
}

export const assertLevelsInItemStore = async (
  scope: MedusaContainer,
  levels: LocationLevel[]
): Promise<void> => {
  if (!levels.length) {
    return
  }
  const [itemSellers, locationSellers] = await Promise.all([
    getInventoryItemSellers(
      scope,
      levels.flatMap((level) =>
        level.inventory_item_id ? [level.inventory_item_id] : []
      )
    ),
    getStockLocationSellers(
      scope,
      levels.map((level) => level.location_id)
    ),
  ])

  const mismatch = levels.find((level) => {
    const itemSeller = level.inventory_item_id
      ? itemSellers.get(level.inventory_item_id) ?? null
      : null
    const locationSeller = locationSellers.get(level.location_id) ?? null
    return itemSeller !== locationSeller
  })

  if (mismatch) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The stock location does not belong to the product's store",
      PRODUCT_STOCK_LOCATION_NOT_SELLER_CODE
    )
  }
}

export const assertInventoryItemsInVariantStore = async (
  scope: MedusaContainer,
  links: VariantInventoryItem[]
): Promise<void> => {
  if (!links.length) {
    return
  }
  const [variantSellers, itemSellers] = await Promise.all([
    getVariantSellers(
      scope,
      links.map((link) => link.variant_id)
    ),
    getInventoryItemSellers(
      scope,
      links.map((link) => link.inventory_item_id)
    ),
  ])

  const mismatch = links.find(
    (link) =>
      (variantSellers.get(link.variant_id) ?? null) !==
      (itemSellers.get(link.inventory_item_id) ?? null)
  )

  if (mismatch) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The inventory item does not belong to the product's store",
      PRODUCT_INVENTORY_ITEM_NOT_SELLER_CODE
    )
  }
}

const runGuard = async (
  next: MedusaNextFunction,
  guard: () => Promise<void>
): Promise<void> => {
  try {
    await guard()
  } catch (error) {
    return next(error)
  }
  return next()
}

type LocationLevelBody = { location_id: string }

/** POST /admin/inventory-items/:id/location-levels */
export const ensureLocationLevelInItemStore = (
  req: AuthenticatedMedusaRequest<LocationLevelBody>,
  _res: MedusaResponse,
  next: MedusaNextFunction
): Promise<void> =>
  runGuard(next, () =>
    assertLevelsInItemStore(req.scope, [
      {
        inventory_item_id: req.params.id,
        location_id: req.validatedBody.location_id,
      },
    ])
  )

type ItemLevelsBatchBody = {
  create?: LocationLevelBody[]
  update?: LocationLevelBody[]
}

/** POST /admin/inventory-items/:id/location-levels/batch */
export const ensureItemLevelsBatchInItemStore = (
  req: AuthenticatedMedusaRequest<ItemLevelsBatchBody>,
  _res: MedusaResponse,
  next: MedusaNextFunction
): Promise<void> =>
  runGuard(next, () =>
    assertLevelsInItemStore(
      req.scope,
      [...(req.validatedBody.create ?? []), ...(req.validatedBody.update ?? [])].map(
        (level) => ({
          inventory_item_id: req.params.id,
          location_id: level.location_id,
        })
      )
    )
  )

type LevelsBatchBody = {
  create?: (LocationLevelBody & { inventory_item_id: string })[]
  update?: (LocationLevelBody & { inventory_item_id: string })[]
}

/** POST /admin/inventory-items/location-levels/batch and /admin/inventory-items/batch */
export const ensureLevelsBatchInItemStore = (
  req: AuthenticatedMedusaRequest<LevelsBatchBody>,
  _res: MedusaResponse,
  next: MedusaNextFunction
): Promise<void> =>
  runGuard(next, () =>
    assertLevelsInItemStore(req.scope, [
      ...(req.validatedBody.create ?? []),
      ...(req.validatedBody.update ?? []),
    ])
  )

type CreateInventoryItemBody = { location_levels?: LocationLevelBody[] }

/** POST /admin/inventory-items — a new item has no store yet. */
export const ensureNewItemLevelsWithoutStore = (
  req: AuthenticatedMedusaRequest<CreateInventoryItemBody>,
  _res: MedusaResponse,
  next: MedusaNextFunction
): Promise<void> =>
  runGuard(next, () =>
    assertLevelsInItemStore(
      req.scope,
      (req.validatedBody.location_levels ?? []).map((level) => ({
        inventory_item_id: null,
        location_id: level.location_id,
      }))
    )
  )

type VariantInventoryItemsBatchBody = {
  create?: VariantInventoryItem[]
  update?: VariantInventoryItem[]
}

/** POST /admin/products/:id/variants/inventory-items/batch */
export const ensureVariantInventoryItemsBatchInStore = (
  req: AuthenticatedMedusaRequest<VariantInventoryItemsBatchBody>,
  _res: MedusaResponse,
  next: MedusaNextFunction
): Promise<void> =>
  runGuard(next, () =>
    assertInventoryItemsInVariantStore(req.scope, [
      ...(req.validatedBody.create ?? []),
      ...(req.validatedBody.update ?? []),
    ])
  )

/** POST /admin/products/:id/variants/:variant_id/inventory-items */
export const ensureVariantInventoryItemInStore = (
  req: AuthenticatedMedusaRequest<{ inventory_item_id: string }>,
  _res: MedusaResponse,
  next: MedusaNextFunction
): Promise<void> =>
  runGuard(next, () =>
    assertInventoryItemsInVariantStore(req.scope, [
      {
        variant_id: req.params.variant_id,
        inventory_item_id: req.validatedBody.inventory_item_id,
      },
    ])
  )
