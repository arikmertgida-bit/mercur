import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { removeProducts } from '../lib/search/sync'

export default async function searchSyncProductDeletedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    await removeProducts([event.data.id])
  } catch (error) {
    logger.error(
      `Search index removal failed for product ${event.data.id}:`,
      error instanceof Error ? error : new Error(String(error))
    )
    throw error
  }
}

export const config: SubscriberConfig = {
  event: 'product.deleted',
  context: {
    subscriberId: 'search-sync-product-deleted-handler',
  },
}
