import { AdminOrderChange } from "@medusajs/types"

import { getOrderChangeActionDetails } from "@lib/order-change-action"

export function countItemsChange(actions: AdminOrderChange["actions"]) {
  let added = 0
  let removed = 0

  actions.forEach((action) => {
    if (action.action === "ITEM_ADD") {
      added += getOrderChangeActionDetails(action).quantity ?? 0
    }
    if (action.action === "ITEM_UPDATE") {
      const quantityDiff =
        getOrderChangeActionDetails(action).quantity_diff ?? 0

      if (quantityDiff > 0) {
        added += quantityDiff
      } else {
        removed += Math.abs(quantityDiff)
      }
    }
  })

  return [added, removed]
}

