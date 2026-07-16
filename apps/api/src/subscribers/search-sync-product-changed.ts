import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { reindexProductsById } from '../lib/search/sync'

export default async function searchSyncProductChangedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    await reindexProductsById(container, [event.data.id])
  } catch (error) {
    logger.error(
      `Search sync failed for product ${event.data.id}:`,
      error instanceof Error ? error : new Error(String(error))
    )
    throw error
  }
}

export const config: SubscriberConfig = {
  event: ['product.created', 'product.updated'],
  context: {
    subscriberId: 'search-sync-product-changed-handler',
  },
}
