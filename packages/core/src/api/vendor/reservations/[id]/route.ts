import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  deleteReservationsWorkflow,
  updateReservationsWorkflow,
} from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"

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

  await updateReservationsWorkflow(req.scope).run({
    input: {
      updates: [{ ...req.validatedBody, id }],
    },
  })

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

  await deleteReservationsWorkflow(req.scope).run({
    input: { ids: [id] },
  })

  res.status(200).json({
    id,
    object: "reservation",
    deleted: true,
  })
}
