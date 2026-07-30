import type { BlockedReason } from "./client"

const BLOCKED_REASON_I18N_KEYS: Record<BlockedReason, string> = {
  EMAIL: "messages.blockedReasonEmail",
  PHONE: "messages.blockedReasonPhone",
  URL: "messages.blockedReasonUrl",
  GENERIC: "messages.blockedReasonGeneric",
}

/**
 * Maps MessengerHttpError.reason to an i18n translation key.
 * The caller invokes `t(getBlockedReasonKey(reason))`.
 */
export function getBlockedReasonKey(reason: BlockedReason | null): string {
  if (reason === null) return BLOCKED_REASON_I18N_KEYS.GENERIC
  return BLOCKED_REASON_I18N_KEYS[reason]
}
