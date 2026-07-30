/**
 * Shared messenger `notificationType` / persisted `metadata.notification_type`
 * tag for every request-related messenger notification — lets the vendor
 * unread badge query messages by category instead of relying on the
 * per-conversation chat unread counter.
 *
 * Requests are always accepted/rejected synchronously by an admin inside
 * `apps/admin` — unlike reviews/followers/orders there is no async event to
 * decouple from, so the accept/reject routes call `notifyMessengerUser`
 * directly instead of going through the event bus.
 */
export const REQUEST_NOTIFICATION_TYPE = "request_notification"
