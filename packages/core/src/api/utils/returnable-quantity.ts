import type { Query } from "@medusajs/framework"
import type { BigNumberInput } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MathBN,
  MedusaError,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

export type ReturnableItemDetail = {
  delivered_quantity: BigNumberInput
  return_requested_quantity: BigNumberInput
  return_received_quantity: BigNumberInput
  return_dismissed_quantity: BigNumberInput
}

export type ReturnableOrderItem = {
  id: string
  detail: ReturnableItemDetail
}

export type RequestedReturnItem = {
  id: string
  quantity: number
}

/**
 * Same formula the admin and vendor dashboards use (`lib/rma.ts`). Medusa's
 * own RETURN_ITEM validation only subtracts `return_requested_quantity` from
 * `fulfilled_quantity`, so a unit that was already received back counts as
 * returnable again.
 */
export function getReturnableQuantity(detail: ReturnableItemDetail): number {
  const alreadyReturned = MathBN.add(
    detail.return_requested_quantity,
    detail.return_received_quantity,
    detail.return_dismissed_quantity
  )
  const returnable = MathBN.sub(detail.delivered_quantity, alreadyReturned)

  return Math.max(0, MathBN.convert(returnable).toNumber())
}

/** Ids of requested items that cannot be returned in the requested amount. */
export function findNonReturnableItems(
  orderItems: ReturnableOrderItem[],
  requested: RequestedReturnItem[]
): string[] {
  const returnableById = new Map(
    orderItems.map((item) => [item.id, getReturnableQuantity(item.detail)])
  )
  const requestedTotals = new Map<string, number>()

  return requested
    .filter((entry) => {
      const returnable = returnableById.get(entry.id)
      if (returnable === undefined || entry.quantity <= 0) {
        return true
      }
      const total = (requestedTotals.get(entry.id) ?? 0) + entry.quantity
      requestedTotals.set(entry.id, total)
      return total > returnable
    })
    .map((entry) => entry.id)
}

export async function assertItemsReturnable(
  scope: MedusaContainer,
  orderId: string,
  requested: RequestedReturnItem[]
): Promise<void> {
  if (!requested.length) {
    return
  }

  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    // query.graph has no "*relation" shorthand (that is the HTTP `fields`
    // syntax): "*items" loads no items, which made every item non-returnable.
    fields: ["id", "items.*", "items.detail.*"],
    filters: { id: orderId },
  })

  const orderItems: ReturnableOrderItem[] = (order?.items ?? []).flatMap(
    (item) => (item?.detail ? [{ id: item.id, detail: item.detail }] : [])
  )
  const invalid = findNonReturnableItems(orderItems, requested)

  if (invalid.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Cannot return more items than were delivered and not yet returned: ${[
        ...new Set(invalid),
      ].join(", ")}.`
    )
  }
}
