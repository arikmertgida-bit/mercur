import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  deleteReservationsWorkflow,
  updateReservationsWorkflow,
} from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import { InventoryWorkflowEvents } from "../../../../workflows"

import { refetchReservation, validateSellerReservation } from "../helpers"

export const GET = async (
  req: AuthenticatedMedusaRequest<HttpTypes.AdminReservationParams>,
  res: MedusaResponse<HttpTypes.AdminReservationResponse>
) => {
  const { id } = req.params

  await validateSellerReservation(req.scope, req.seller_context!.seller_id, id)

  const reservation = await refetchReservation(
    id,
    req.scope,
    req.queryConfig.fields
  )

  if (!reservation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Reservation with id: ${id} was not found`
    )
  }

  res.status(200).json({ reservation })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<
    HttpTypes.AdminUpdateReservation,
    HttpTypes.AdminReservationParams
  >,
  res: MedusaResponse<HttpTypes.AdminReservationResponse>
) => {
  const { id } = req.params

  await validateSellerReservation(req.scope, req.seller_context!.seller_id, id)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [existing],
  } = await query.graph({
    entity: "reservation",
    fields: ["inventory_item_id"],
    filters: { id },
  })

  await updateReservationsWorkflow(req.scope).run({
    input: {
      updates: [{ ...req.validatedBody, id }],
    },
  })

  if (existing?.inventory_item_id) {
    await req.scope.resolve(Modules.EVENT_BUS).emit({
      name: InventoryWorkflowEvents.LEVEL_CHANGED,
      data: { inventory_item_ids: [existing.inventory_item_id] },
    })
  }

  const reservation = await refetchReservation(
    id,
    req.scope,
    req.queryConfig.fields
  )
  res.status(200).json({ reservation })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.AdminReservationDeleteResponse>
) => {
  const id = req.params.id

  await validateSellerReservation(req.scope, req.seller_context!.seller_id, id)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [existing],
  } = await query.graph({
    entity: "reservation",
    fields: ["inventory_item_id"],
    filters: { id },
  })

  await deleteReservationsWorkflow(req.scope).run({
    input: { ids: [id] },
  })

  if (existing?.inventory_item_id) {
    await req.scope.resolve(Modules.EVENT_BUS).emit({
      name: InventoryWorkflowEvents.LEVEL_CHANGED,
      data: { inventory_item_ids: [existing.inventory_item_id] },
    })
  }

  res.status(200).json({
    id,
    object: "reservation",
    deleted: true,
  })
}
