import type { BigNumberInput, PaymentDTO } from "@medusajs/framework/types"
import type { Hook, ReturnWorkflow } from "@medusajs/framework/workflows-sdk"
import {
  capturePaymentWorkflow as medusaCapturePaymentWorkflow,
  refundPaymentWorkflow as medusaRefundPaymentWorkflow,
  type CapturePaymentWorkflowInput,
  type RefundPaymentWorkflowInput,
} from "@medusajs/medusa/core-flows"

export type CapturePaymentWorkflowHooks = [
  Hook<
    "paymentCaptured",
    {
      payment: PaymentDTO
      order_id: string | null
      amount: BigNumberInput | null
    },
    void
  >,
]

export type RefundPaymentWorkflowHooks = [
  Hook<
    "paymentRefunded",
    {
      payment: PaymentDTO
      order_id: string | null
      amount: BigNumberInput | null
      credit_line_amount: BigNumberInput
      refund_reason: { id: string; label: string; code: string | null } | null
    },
    void
  >,
]

// The hooks come from the core-flows payment-hooks patch, which is applied in
// memory and cannot reach Medusa's shipped typings (they declare no hooks).
// Keep the hook types in sync with
// patches/@medusajs+core-flows@*-payment-hooks.patch; if Medusa ever types the
// hooks itself, the directives below fail the build and can be removed.
// @ts-expect-error -- Medusa core-flows boundary, see above.
export const capturePaymentWorkflow: ReturnWorkflow<
  CapturePaymentWorkflowInput,
  PaymentDTO,
  CapturePaymentWorkflowHooks
> = medusaCapturePaymentWorkflow

// @ts-expect-error -- Medusa core-flows boundary, see above.
export const refundPaymentWorkflow: ReturnWorkflow<
  RefundPaymentWorkflowInput,
  PaymentDTO,
  RefundPaymentWorkflowHooks
> = medusaRefundPaymentWorkflow
