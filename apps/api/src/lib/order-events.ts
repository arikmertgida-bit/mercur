/**
 * Shared messenger `notificationType` / persisted `metadata.notification_type`
 * tag for every order-related messenger notification — lets the vendor
 * Orders unread badge query messages by category instead of relying on
 * the per-conversation chat unread counter.
 *
 * Unlike reviews/followers, order placement already emits a native Medusa
 * event (`OrderWorkflowEvents.PLACED`, once per split seller order — see
 * `complete-cart-with-split-orders.ts`), so no custom event/emit helper is
 * needed here; `order-notification-new-order.ts` subscribes to it directly.
 */
export const ORDER_NOTIFICATION_TYPE = "order_notification"
