import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { enqueuePendingInventoryItems } from '../lib/search/inventory-pending-set'

export default async function inventoryLevelChangedHandler({
  event,
  container,
}: SubscriberArgs<{ inventory_item_ids: string[] }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    await enqueuePendingInventoryItems(container, event.data.inventory_item_ids ?? [])
  } catch (error) {
    logger.error(
      '[inventory-level-changed] failed to enqueue pending items for search sync:',
      error instanceof Error ? error : new Error(String(error))
    )
    throw error
  }
}

export const config: SubscriberConfig = {
  event: 'inventory_level.changed',
  context: {
    subscriberId: 'inventory-level-changed-handler',
  },
}
