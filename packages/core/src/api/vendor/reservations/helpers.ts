import { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

export const refetchReservation = async (
  reservationId: string,
  scope: MedusaContainer,
  fields: string[]
) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "reservation",
    variables: {
      filters: { id: reservationId },
    },
    fields: fields,
  })

  const reservations = await remoteQuery(queryObject)
  return reservations[0]
}

/**
 * These routes reuse Medusa's own admin reservation workflows verbatim, with
 * no seller-scoping of their own — a reservation carries no seller_id, only
 * an inventory_item_id, so ownership is resolved through the same
 * inventory_item_seller link `vendor/inventory-items/helpers.ts` uses.
 */
export const validateSellerReservation = async (
  scope: MedusaContainer,
  sellerId: string,
  reservationId: string
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [reservation],
  } = await query.graph({
    entity: "reservation",
    filters: { id: reservationId },
    fields: ["id", "inventory_item_id"],
  })

  if (!reservation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Reservation with id: ${reservationId} was not found`
    )
  }

  const {
    data: [sellerInventoryItem],
  } = await query.graph({
    entity: "inventory_item_seller",
    filters: {
      seller_id: sellerId,
      inventory_item_id: reservation.inventory_item_id,
    },
    fields: ["seller_id"],
  })

  if (!sellerInventoryItem) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Reservation with id: ${reservationId} was not found`
    )
  }
}
