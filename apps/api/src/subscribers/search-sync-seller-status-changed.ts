import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { getProductIdsForSeller, reindexProductsById } from '../lib/search/sync'

// Re-indexing (not deleting) is deliberate: it re-fetches the seller's current
// status onto every affected product doc, so the provider's own
// `seller_status = "open"` filter starts/stops excluding them correctly —
// whichever direction the transition went.
export default async function searchSyncSellerStatusChangedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const productIds = await getProductIdsForSeller(container, event.data.id)
    await reindexProductsById(container, productIds)
  } catch (error) {
    logger.error(
      `Search sync failed for seller ${event.data.id} status change:`,
      error instanceof Error ? error : new Error(String(error))
    )
    throw error
  }
}

export const config: SubscriberConfig = {
  event: ['seller.suspended', 'seller.unsuspended'],
  context: {
    subscriberId: 'search-sync-seller-status-changed-handler',
  },
}
