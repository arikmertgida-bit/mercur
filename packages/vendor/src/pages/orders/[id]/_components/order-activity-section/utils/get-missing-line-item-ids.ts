import { AdminOrder, AdminOrderChange } from "@medusajs/types"

import { getOrderChangeActionDetails } from "@lib/order-change-action"

export function getMissingLineItemIds(order: AdminOrder, changes: AdminOrderChange[]) {
  if (!changes?.length) {
    return []
  }

  const retIds = new Set<string>()
  const existingItemsMap = new Map(order.items.map((item) => [item.id, true]))

  changes.forEach((change) => {
    change.actions.forEach((action) => {
      const referenceId = getOrderChangeActionDetails(action).reference_id

      if (!referenceId) {
        return
      }

      if (referenceId.startsWith("ordli_") && !existingItemsMap.has(referenceId)) {
        retIds.add(referenceId)
      }
    })
  })

  return Array.from(retIds)
}

