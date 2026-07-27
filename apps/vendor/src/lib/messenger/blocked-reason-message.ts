import type { BlockedReason } from "./client"

const BLOCKED_REASON_I18N_KEYS: Record<BlockedReason, string> = {
  EMAIL: "messages.blockedReasonEmail",
  PHONE: "messages.blockedReasonPhone",
  URL: "messages.blockedReasonUrl",
  GENERIC: "messages.blockedReasonGeneric",
}

/**
 * MessengerHttpError.reason'ı i18n çeviri anahtarına çevirir.
 * Çağıran taraf `t(getBlockedReasonKey(reason))` çağırır.
 */
export function getBlockedReasonKey(reason: BlockedReason | null): string {
  if (reason === null) return BLOCKED_REASON_I18N_KEYS.GENERIC
  return BLOCKED_REASON_I18N_KEYS[reason]
}
