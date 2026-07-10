import { MercurModules } from "@mercurjs/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import PayoutModuleService from "../modules/payout/services/payout-module-service"
import { ProviderWebhookPayload } from "@medusajs/framework/types"
import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { processPayoutForWebhookWorkflowId } from "../workflows/payout"
import { z } from "zod"

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ])
)

const SerializedBufferSchema = z.object({
  type: z.literal("Buffer"),
  data: z.array(z.number()),
})

const PayoutWebhookPayloadSchema = z.object({
  data: z.record(z.string(), JsonValueSchema),
  rawData: z.union([z.string(), z.instanceof(Buffer), SerializedBufferSchema]),
  headers: z.record(z.string(), JsonValueSchema),
})

export default async function payoutWebhookHandler({
  event,
  container,
}: SubscriberArgs<ProviderWebhookPayload["payload"]>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const parsed = PayoutWebhookPayloadSchema.safeParse(event.data)
  if (!parsed.success) {
    logger.error(
      `Payout webhook received an invalid payload shape: ${parsed.error.message}`
    )
    return
  }

  const rawData = parsed.data.rawData
  const normalizedRawData =
    typeof rawData === "string" || Buffer.isBuffer(rawData)
      ? rawData
      : Buffer.from(rawData.data)
  const input = { ...parsed.data, rawData: normalizedRawData }

  try {
    const payoutService = container.resolve<PayoutModuleService>(MercurModules.PAYOUT)
    const processedEvent = await payoutService.getWebhookActionAndData(input)

    if (!processedEvent.data) {
      return
    }

    const wfEngine = container.resolve(Modules.WORKFLOW_ENGINE)
    await wfEngine.run(processPayoutForWebhookWorkflowId, { input: processedEvent })
  } catch (error) {
    // Log only, do not rethrow: an uncaught subscriber error loses the event,
    // and a payout webhook failure must never vanish silently.
    logger.error("Payout webhook processing failed:", error as Error)
  }
}

export const config: SubscriberConfig = {
  event: "payout.webhook_received",
  context: {
    subscriberId: "payout-webhook-handler",
  },
}
