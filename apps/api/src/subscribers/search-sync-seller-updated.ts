import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { getProductIdsForSeller, reindexProductsById } from "../lib/search/sync"

// Generic seller edits (name, logo, and — critically — the operator-only
// `is_premium` "Featured Store" flag) go through `updateSellersWorkflow`
// and only emit `seller.updated`, unlike the dedicated `seller.suspended` /
// `seller.unsuspended` events handled by
// `search-sync-seller-status-changed.ts`. Re-indexing (not deleting) is
// deliberate: it re-fetches the seller's current `is_premium` value onto
// every affected product doc so the `seller_is_premium` ranking rule and any
// storefront badge reflect the change immediately.
export default async function searchSyncSellerUpdatedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const productIds = await getProductIdsForSeller(container, event.data.id)
    await reindexProductsById(container, productIds)
  } catch (error) {
    logger.error(
      `Search sync failed for seller ${event.data.id} update:`,
      error instanceof Error ? error : new Error(String(error))
    )
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "seller.updated",
  context: {
    subscriberId: "search-sync-seller-updated-handler",
  },
}
