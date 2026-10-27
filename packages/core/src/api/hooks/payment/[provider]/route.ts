import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { z } from "zod"

import { PaymentWebhookEvents } from "../../../../workflows/events"

const DEFAULT_WEBHOOK_DELAY_MS = 5000
const DEFAULT_WEBHOOK_RETRIES = 3

// The webhook tuning knobs a project may set on the payment module's options
// in `medusa-config.ts`; every other option belongs to the module itself.
const WebhookOptionsSchema = z.object({
  webhook_delay: z.number().int().positive().optional(),
  webhook_retries: z.number().int().positive().optional(),
})

type WebhookOptions = z.infer<typeof WebhookOptionsSchema>

// Reads the options from the payment module's declaration: the resolved
// module service does not expose them.
const getWebhookOptions = (req: MedusaRequest): WebhookOptions => {
  const configModule = req.scope.resolve(
    ContainerRegistrationKeys.CONFIG_MODULE
  )
  const declaration = configModule.modules?.[Modules.PAYMENT]

  if (typeof declaration !== "object") {
    return {}
  }

  const parsed = WebhookOptionsSchema.safeParse(declaration.options ?? {})

  return parsed.success ? parsed.data : {}
}

// Overrides Medusa's `/hooks/payment/:provider` route — plugin routes are
// registered after core's, so this file wins the path. It is identical except
// for the event name: emitting Mercur's own event keeps Medusa's
// `payment-webhook` subscriber — and with it the stock cart completion — out
// of the marketplace checkout entirely.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { provider } = req.params

    const options = getWebhookOptions(req)

    const eventBus = req.scope.resolve(Modules.EVENT_BUS)

    await eventBus.emit(
      {
        name: PaymentWebhookEvents.WEBHOOK_RECEIVED,
        data: {
          provider,
          payload: {
            data: req.body,
            rawData: req.rawBody,
            headers: req.headers,
          },
        },
      },
      {
        delay: options.webhook_delay ?? DEFAULT_WEBHOOK_DELAY_MS,
        attempts: options.webhook_retries ?? DEFAULT_WEBHOOK_RETRIES,
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(400).send(`Webhook Error: ${message}`)
    return
  }

  res.sendStatus(200)
}
