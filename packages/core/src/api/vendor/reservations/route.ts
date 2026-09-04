import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

import { createReservationsWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import { InventoryWorkflowEvents } from "../../../workflows"

import { refetchReservation } from "./helpers"

export const GET = async (
  req: AuthenticatedMedusaRequest<HttpTypes.AdminGetReservationsParams>,
  res: MedusaResponse<HttpTypes.AdminReservationListResponse>
) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const sellerId = req.seller_context!.seller_id

  // reservation carries no seller_id of its own — resolve the seller's own
  // inventory item ids first so the list can never surface another
  // seller's stock reservations.
  const { data: sellerInventoryItems } = await query.graph({
    entity: "inventory_item_seller",
    fields: ["inventory_item_id"],
    filters: { seller_id: sellerId },
  })
  const ownInventoryItemIds = sellerInventoryItems.map(
    (item) => item.inventory_item_id
  )

  const queryObject = remoteQueryObjectFromString({
    entryPoint: "reservation",
    variables: {
      filters: { ...req.filterableFields, inventory_item_id: ownInventoryItemIds },
      ...req.queryConfig.pagination,
    },
    fields: req.queryConfig.fields,
  })

  const { rows: reservations, metadata } = await remoteQuery(queryObject)

  res.json({
    reservations,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<
    HttpTypes.AdminCreateReservation,
    HttpTypes.AdminReservationParams
  >,
  res: MedusaResponse<HttpTypes.AdminReservationResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [sellerInventoryItem],
  } = await query.graph({
    entity: "inventory_item_seller",
    fields: ["seller_id"],
    filters: {
      seller_id: req.seller_context!.seller_id,
      inventory_item_id: req.validatedBody.inventory_item_id,
    },
  })

  if (!sellerInventoryItem) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Inventory item with id: ${req.validatedBody.inventory_item_id} was not found`
    )
  }

  const input = [req.validatedBody]

  const { result } = await createReservationsWorkflow(req.scope).run({
    input: { reservations: input },
  })

  await req.scope.resolve(Modules.EVENT_BUS).emit({
    name: InventoryWorkflowEvents.LEVEL_CHANGED,
    data: { inventory_item_ids: [req.validatedBody.inventory_item_id] },
  })

  const reservation = await refetchReservation(
    result[0].id,
    req.scope,
    req.queryConfig.fields
  )
  res.status(200).json({ reservation })
}
