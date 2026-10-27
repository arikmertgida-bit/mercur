import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ProviderWebhookPayload } from "@medusajs/framework/types"
import { Modules, PaymentActions } from "@medusajs/framework/utils"
import { z } from "zod"

import { PaymentWebhookEvents } from "../workflows/events"
import { processPaymentWorkflowId } from "../workflows/payment"

// A `Buffer` as it comes back from the event bus: JSON-serialized into its
// byte array.
const SerializedBufferSchema = z.object({
  type: z.literal("Buffer"),
  data: z.array(z.number().int().min(0).max(255)),
})

const IGNORED_ACTIONS: string[] = [
  PaymentActions.NOT_SUPPORTED,
  PaymentActions.CANCELED,
  PaymentActions.FAILED,
  PaymentActions.REQUIRES_MORE,
  PaymentActions.PENDING_AUTHORIZATION,
  // Intermediate provider events (e.g. Stripe `payment_intent.created`) must
  // not trigger cart completion.
  PaymentActions.PENDING,
]

export default async function paymentWebhookHandler({
  event,
  container,
}: SubscriberArgs<ProviderWebhookPayload>) {
  const paymentService = container.resolve(Modules.PAYMENT)

  const input = event.data

  const serializedRawData = SerializedBufferSchema.safeParse(
    input.payload?.rawData
  )
  if (input.payload && serializedRawData.success) {
    input.payload.rawData = Buffer.from(serializedRawData.data.data)
  }

  const processedEvent = await paymentService.getWebhookActionAndData(input)

  // Without a session id the event cannot be tied to a payment session, and
  // the workflow's filters would resolve to an arbitrary unrelated cart.
  if (!processedEvent.data?.session_id) {
    return
  }

  if (IGNORED_ACTIONS.includes(processedEvent.action)) {
    return
  }

  const wfEngine = container.resolve(Modules.WORKFLOW_ENGINE)
  await wfEngine.run(processPaymentWorkflowId, { input: processedEvent })
}

export const config: SubscriberConfig = {
  event: PaymentWebhookEvents.WEBHOOK_RECEIVED,
  context: {
    subscriberId: "mercur-payment-webhook-handler",
  },
}
