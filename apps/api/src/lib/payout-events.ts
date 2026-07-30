/**
 * Shared messenger `notificationType` / persisted `metadata.notification_type`
 * tag for every payout-related messenger notification — lets the vendor
 * Notification Preferences toggle gate it like the other categories.
 *
 * Unlike reviews/followers, a payout being marked paid already emits a
 * native Medusa event (`payout.updated`, auto-emitted by the payout module
 * service's generated `updatePayouts` call — see `updatePayoutStep`), so no
 * custom event/emit helper is needed here; `payout-notification-completed.ts`
 * subscribes to it directly and filters for `status === "paid"`.
 */
export const PAYOUT_NOTIFICATION_TYPE = "payout_notification"
