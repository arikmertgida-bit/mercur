import { SUPPORTED_VENDOR_LANGUAGES, type VendorLanguage } from "../vendor-error-i18n/languages"

/**
 * Same 31-locale set the vendor panel and vendor-error-i18n support, plus
 * "en" (vendor-error-i18n treats "en" as "no translation needed" and never
 * lists it explicitly; notification content has no separate English source
 * of truth to fall back to, so it is listed here like every other locale).
 */
export const NOTIFICATION_LANGUAGES = [
  ...SUPPORTED_VENDOR_LANGUAGES,
  "en",
] as const

export type NotificationLanguage = VendorLanguage | "en"

const SUPPORTED_SET: ReadonlySet<string> = new Set(NOTIFICATION_LANGUAGES)

export function isNotificationLanguage(value: string): value is NotificationLanguage {
  return SUPPORTED_SET.has(value)
}

/**
 * Messenger notifications have no per-request Accept-Language header (they
 * fire from async subscribers, not synchronous vendor API calls) — the
 * recipient's locale comes from their stored `metadata.locale` instead (see
 * `resolve-locale.ts`). Falls back to "tr" (not "en") because every existing
 * seller/customer predates this field and the product's default market and
 * historical behavior is Turkish.
 */
export const DEFAULT_NOTIFICATION_LANGUAGE: NotificationLanguage = "tr"
