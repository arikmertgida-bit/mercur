import { MedusaError } from "@medusajs/framework/utils"

/**
 * Narrows a catch-clause value without using the `unknown` type.
 */
export function getCatchMessage(err: Error | string | null | undefined): string {
  if (err instanceof Error) {
    return err.message
  }
  if (typeof err === "string") {
    return err
  }
  return "unexpected_error"
}

/**
 * Shape of an error after it crossed the workflow engine. Workflow step
 * failures are stored in the (Redis) transaction and re-thrown by
 * `workflow.run()` as `errors[0].error` — a serialized plain object, not an
 * `Error` instance — but Medusa's `__isMedusaError`, `type` and `code` survive.
 */
type SerializedErrorShape = {
  message?: string
  type?: string
  code?: string
  __isMedusaError?: boolean
}

/**
 * Normalizes whatever reached an error handler into a real `Error` (a real
 * `MedusaError` when the payload carries Medusa's marker), so the
 * store/admin/vendor translators handle workflow failures — insufficient
 * inventory, invalid cart/order changes — instead of passing them through
 * untranslated. Returns `null` for values with no usable message.
 */
export function toHandledError(
  error: Error | SerializedErrorShape | string | null | undefined
): Error | null {
  if (error instanceof Error) {
    return error
  }
  if (!error || typeof error !== "object" || typeof error.message !== "string") {
    return null
  }
  if (error.__isMedusaError && typeof error.type === "string") {
    return new MedusaError(error.type, error.message, error.code)
  }
  return new Error(error.message)
}
