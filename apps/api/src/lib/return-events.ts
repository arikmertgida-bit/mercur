/**
 * Shared messenger `notificationType` / persisted `metadata.notification_type`
 * tag for every return-related messenger notification — lets the vendor
 * "İadeler" mute preference and any future unread query by category instead
 * of relying on the per-conversation chat unread counter.
 *
 * Confirming a return request already emits a native Medusa event
 * (`OrderWorkflowEvents.RETURN_REQUESTED`, fired from both the storefront's
 * `/store/returns` flow and the vendor's own `/vendor/returns` flow — see
 * `confirm-return-request.ts` in `@medusajs/core-flows`), so no custom
 * event/emit helper is needed here; `return-notification-new-return.ts`
 * subscribes to it directly.
 */
export const RETURN_NOTIFICATION_TYPE = "return_notification"
