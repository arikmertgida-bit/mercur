import { LoaderOptions } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { asValue } from "@medusajs/framework/awilix"
import Redis from "ioredis"
import { z } from "zod"

const MessagingRedisOptionsSchema = z.object({
  redisUrl: z.string().optional(),
})

export default async function messagingRedisConnectionLoader({
  container,
  options,
}: LoaderOptions): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const { redisUrl } = MessagingRedisOptionsSchema.parse(options ?? {})

  if (!redisUrl) {
    logger.warn(
      "[messaging-redis] No redisUrl provided in module options — Redis features disabled"
    )
    container.register("messagingRedisConnection", asValue(null))
    return
  }

  try {
    const connection = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 5) return null
        return Math.min(times * 200, 2000)
      },
    })

    await connection.connect()

    container.register("messagingRedisConnection", asValue(connection))

    logger.info("[messaging-redis] Connected to Redis")
  } catch (err) {
    logger.error(
      `[messaging-redis] Failed to connect to Redis: ${err instanceof Error ? err.message : String(err)}`
    )
    container.register("messagingRedisConnection", asValue(null))
  }
}
