import { requirePermission } from "../../utils"
import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
  MiddlewareRoute,
} from "@medusajs/framework/http"
import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "zod"

import { parseGraphRows } from "../../../utils/graph-rows"
import { QueryFilter } from "../../../utils/query-filter"
import { vendorReservationQueryConfig } from "./query-config"
import {
  VendorCreateReservation,
  VendorCreateReservationType,
  VendorGetReservationParams,
  VendorGetReservationsParams,
  VendorUpdateReservation,
} from "./validators"
import { getSellerId } from "../../utils/seller-context"

type ReservationFilterFields = QueryFilter & {
  sku?: string
  inventory_item_id?: string | string[]
}

const IdRowSchema = z.object({ id: z.string() })

const InventoryItemIdRowSchema = z.object({ inventory_item_id: z.string() })

const ReservationRowSchema = z.object({
  id: z.string(),
  inventory_item_id: z.string(),
})

/**
 * Reservations have no direct reservation↔seller link — they belong to a seller
 * only through their inventory item (`inventory_item_seller`). These middlewares
 * scope the vendor reservation routes to the caller's own inventory items so a
 * vendor can never read, list, edit, delete, or create a reservation against
 * another store's inventory.
 */
const getSellerInventoryItemIds = async (
  req: AuthenticatedMedusaRequest,
  restrictTo?: string[]
): Promise<string[]> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const filters: QueryFilter = {
    seller_id: getSellerId(req),
  }
  if (restrictTo?.length) {
    filters.inventory_item_id = restrictTo
  }

  const { data } = await query.graph({
    entity: "inventory_item_seller",
    fields: ["inventory_item_id"],
    filters,
    pagination: {
      take: restrictTo?.length ? restrictTo.length : 100000,
      skip: 0,
    },
  })

  return parseGraphRows(InventoryItemIdRowSchema, data).map(
    (row) => row.inventory_item_id
  )
}

// The list exposes a free-text SKU filter; SKU lives on the linked inventory
// item, which the reservation query can't filter through a nested relation
// path. Resolve the matching inventory item ids and narrow the query by
// `inventory_item_id`. Runs before the seller scope so a sku query is
// intersected with the seller's own items rather than replacing it.
const maybeApplyInventoryItemSkuFilter = async (
  req: AuthenticatedMedusaRequest<never, ReservationFilterFields>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const sku = req.filterableFields?.sku
  if (!sku) {
    return next()
  }

  delete req.filterableFields.sku

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
    filters: { sku },
  })

  const matchedIds = parseGraphRows(IdRowSchema, inventoryItems).map(
    (item) => item.id
  )
  const existing = req.filterableFields.inventory_item_id

  if (existing) {
    const existingIds = Array.isArray(existing) ? existing : [existing]
    req.filterableFields.inventory_item_id = existingIds.filter((id) =>
      matchedIds.includes(id)
    )
  } else {
    req.filterableFields.inventory_item_id = matchedIds
  }

  return next()
}

const applySellerReservationsFilter = async (
  req: AuthenticatedMedusaRequest<never, ReservationFilterFields>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  try {
    const requested = req.filterableFields.inventory_item_id

    let allowedIds: string[]
    if (requested !== undefined && requested !== null) {
      const requestedIds = Array.isArray(requested) ? requested : [requested]
      // Keep only the requested items the seller actually owns.
      allowedIds = await getSellerInventoryItemIds(req, requestedIds)
    } else {
      allowedIds = await getSellerInventoryItemIds(req)
    }

    // Sentinel that matches nothing, so an empty set never widens the query.
    req.filterableFields.inventory_item_id = allowedIds.length
      ? allowedIds
      : ["__none__"]

    return next()
  } catch (error) {
    return next(error)
  }
}

const assertReservationOwnership = async (
  req: AuthenticatedMedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "reservation",
      fields: ["id", "inventory_item_id"],
      filters: { id: req.params.id },
    })

    const [reservation] = parseGraphRows(ReservationRowSchema, data)

    const owned = reservation
      ? await getSellerInventoryItemIds(req, [reservation.inventory_item_id])
      : []

    if (!reservation || !owned.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Reservation with id: ${req.params.id} was not found`
      )
    }

    return next()
  } catch (error) {
    return next(error)
  }
}

const assertCreateReservationOwnership = async (
  req: AuthenticatedMedusaRequest<VendorCreateReservationType>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  try {
    const itemId = req.validatedBody?.inventory_item_id
    const owned = itemId ? await getSellerInventoryItemIds(req, [itemId]) : []

    if (!owned.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "You are not allowed to create a reservation for this inventory item"
      )
    }

    return next()
  } catch (error) {
    return next(error)
  }
}

export const vendorReservationsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/vendor/reservations",
    middlewares: [
      requirePermission("reservations", "view"),
      validateAndTransformQuery(
        VendorGetReservationsParams,
        vendorReservationQueryConfig.list
      ),
      maybeApplyInventoryItemSkuFilter,
      applySellerReservationsFilter,
    ],
  },
  {
    method: ["GET"],
    matcher: "/vendor/reservations/:id",
    middlewares: [
      requirePermission("reservations", "view"),
      validateAndTransformQuery(
        VendorGetReservationParams,
        vendorReservationQueryConfig.retrieve
      ),
      assertReservationOwnership,
    ],
  },
  {
    method: ["POST"],
    matcher: "/vendor/reservations",
    middlewares: [
      requirePermission("reservations", "edit"),
      validateAndTransformBody(VendorCreateReservation),
      assertCreateReservationOwnership,
      validateAndTransformQuery(
        VendorGetReservationParams,
        vendorReservationQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/vendor/reservations/:id",
    middlewares: [
      requirePermission("reservations", "edit"),
      validateAndTransformBody(VendorUpdateReservation),
      assertReservationOwnership,
      validateAndTransformQuery(
        VendorGetReservationParams,
        vendorReservationQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/vendor/reservations/:id",
    middlewares: [
      requirePermission("reservations", "manage"),
      assertReservationOwnership],
  },
]
