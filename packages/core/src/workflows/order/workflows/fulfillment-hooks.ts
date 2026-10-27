import type { Hook, ReturnWorkflow } from "@medusajs/framework/workflows-sdk"
import {
  markOrderFulfillmentAsDeliveredWorkflow as medusaMarkOrderFulfillmentAsDeliveredWorkflow,
  type MarkOrderFulfillmentAsDeliveredWorkflowInput,
} from "@medusajs/medusa/core-flows"

export type MarkOrderFulfillmentAsDeliveredWorkflowHooks = [
  Hook<
    "fulfillmentDelivered",
    {
      order_id: string
      fulfillment_id: string
    },
    void
  >,
]

// The hook comes from the core-flows delivery-hook patch, which is applied in
// memory and cannot reach Medusa's shipped typings (they declare no hooks).
// Keep the hook type in sync with
// patches/@medusajs+core-flows@*-delivery-hook.patch; if Medusa ever types the
// hook itself, the directive below fails the build and can be removed.
// @ts-expect-error -- Medusa core-flows boundary, see above.
export const markOrderFulfillmentAsDeliveredWorkflow: ReturnWorkflow<
  MarkOrderFulfillmentAsDeliveredWorkflowInput,
  undefined,
  MarkOrderFulfillmentAsDeliveredWorkflowHooks
> = medusaMarkOrderFulfillmentAsDeliveredWorkflow
