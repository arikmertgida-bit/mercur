import { MedusaError } from "@medusajs/framework/utils"

import type { StoreLanguage } from "./languages"
import { STORE_ERROR_MESSAGES, StoreErrorMessages } from "./messages"

export interface TranslatedStoreError {
  code: string
  type: string
  message: string
}

const VALIDATION_PREFIX = "Invalid request: "

/**
 * Matches a bare camelCase identifier (`"duplicateOrderReview"`,
 * `"orderNotFound"`) with no spaces or punctuation — the shape this
 * codebase's own `MedusaError(type, "someCode")` throws use (see e.g.
 * `workflows/review/steps/validate-review.ts`) instead of a human sentence.
 * The storefront's `backend-error-mapper.ts` matches these exact strings
 * against its own `BackendErrorCodeSchema` catalog and renders its own
 * (already 31-locale-translated) copy from `message` — so translating the
 * code here would only ever destroy a more precise, already-localized
 * frontend message in favor of a generic one. A plain English MedusaError
 * ("Unauthorized", "Not allowed") never matches: this requires an uppercase
 * letter after the first character, which those don't have.
 */
const CODE_LIKE_MESSAGE = /^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/

/**
 * Translates one `; `-joined segment of the message
 * `@medusajs/framework`'s `zodValidator` produces (see
 * `zod-helpers.js::formatError`) — the exact phrasings below are that
 * function's own output, not a guess. No store-domain custom-coded
 * validator exists today (unlike ../vendor-error-i18n, which has one for
 * product/shipping-option validators), so there's no custom-code branch
 * here — add one the same way vendor's `customCodeMessage` does if a
 * `/store/*` validator ever needs it.
 */
function translateValidationSegment(
  segment: string,
  messages: StoreErrorMessages
): string {
  let match = segment.match(/^Field '(.+)' is required$/)
  if (match) {
    return messages.requiredField.replace("{field}", match[1])
  }

  match = segment.match(/^Expected type: '.+' for field '(.+)', got: '.+'$/)
  if (match) {
    return messages.invalidField.replace("{field}", match[1])
  }

  match = segment.match(
    /^Value for field '(.+)' too small, expected at least: '(.+)'$/
  )
  if (match) {
    return messages.tooSmall
      .replace("{field}", match[1])
      .replace("{min}", match[2])
  }

  match = segment.match(
    /^Value for field '(.+)' too big, expected at most: '(.+)'$/
  )
  if (match) {
    return messages.tooBig
      .replace("{field}", match[1])
      .replace("{max}", match[2])
  }

  match = segment.match(/^Value for field '(.+)' not multiple of: '.+'$/)
  if (match) {
    return messages.invalidFormat.replace("{field}", match[1])
  }

  match = segment.match(/^Unrecognized fields?: '(.+)'$/)
  if (match) {
    return messages.unrecognizedKeys.replace("{keys}", match[1])
  }

  match = segment.match(/^Expected: '.+' for field '(.+)', but got: '.+'$/)
  if (match) {
    return messages.invalidField.replace("{field}", match[1])
  }

  return messages.typeFallback.invalidData
}

function translateValidationMessage(
  message: string,
  messages: StoreErrorMessages
): string {
  const detail = message.startsWith(VALIDATION_PREFIX)
    ? message.slice(VALIDATION_PREFIX.length)
    : message

  const segments = detail
    .split("; ")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)

  if (segments.length === 0) {
    return messages.typeFallback.invalidData
  }

  return segments
    .map((segment) => translateValidationSegment(segment, messages))
    .join(" ")
}

/**
 * Matches the "not found" phrasings actually produced in this codebase:
 * Medusa's base module service (`"X with id: v was not found"`, `"X with
 * id, seller_id: v1, v2 was not found"`) and this project's own
 * hand-written throws (`"X with id v was not found"`, `"X v not found"`).
 */
function matchNotFound(message: string): { entity: string; id: string } | null {
  let match = message.match(/^(.+?) with .+?:\s*(.+?) was not found\.?$/i)
  if (match) {
    return { entity: match[1].trim(), id: match[2].trim() }
  }

  match = message.match(/^(.+?) with id (\S+) was not found\.?$/i)
  if (match) {
    return { entity: match[1].trim(), id: match[2].trim() }
  }

  match = message.match(/^(.+?) (\S+) not found\.?$/i)
  if (match) {
    return { entity: match[1].trim(), id: match[2].trim() }
  }

  return null
}

function typeFallbackFor(type: string, messages: StoreErrorMessages): string {
  switch (type) {
    case MedusaError.Types.NOT_FOUND:
      return messages.typeFallback.notFound
    case MedusaError.Types.INVALID_DATA:
      return messages.typeFallback.invalidData
    case MedusaError.Types.NOT_ALLOWED:
      return messages.typeFallback.notAllowed
    case MedusaError.Types.UNAUTHORIZED:
      return messages.typeFallback.unauthorized
    case MedusaError.Types.FORBIDDEN:
      return messages.typeFallback.forbidden
    case MedusaError.Types.CONFLICT:
      return messages.typeFallback.conflict
    case MedusaError.Types.DUPLICATE_ERROR:
      return messages.typeFallback.duplicate
    case MedusaError.Types.DB_ERROR:
      return messages.typeFallback.dbError
    case MedusaError.Types.UNEXPECTED_STATE:
      return messages.typeFallback.unexpectedState
    case MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR:
    case MedusaError.Types.PAYMENT_REQUIRES_MORE_ERROR:
      return messages.typeFallback.paymentError
    default:
      return messages.typeFallback.default
  }
}

/**
 * Three-tier translation: (1) structured validation messages produced by
 * `zodValidator` — deterministic, field-by-field; (2) known `MedusaError`
 * types — a regex template for the very common "not found" phrasing, a
 * translated generic sentence per type otherwise; (3) anything unmodeled —
 * always a translated generic sentence, never the raw English message (the
 * original is left in `error.message` for server-side logging by the
 * caller).
 */
export function translateStoreError(
  error: Error,
  language: StoreLanguage
): TranslatedStoreError {
  const messages = STORE_ERROR_MESSAGES[language]

  if (MedusaError.isMedusaError(error)) {
    if (CODE_LIKE_MESSAGE.test(error.message)) {
      return {
        code: error.code ?? error.message,
        type: error.type,
        message: error.message,
      }
    }

    if (
      error.type === MedusaError.Types.INVALID_DATA &&
      error.message.startsWith(VALIDATION_PREFIX)
    ) {
      return {
        code: error.code ?? "invalid_request_error",
        type: error.type,
        message: translateValidationMessage(error.message, messages),
      }
    }

    if (error.type === MedusaError.Types.NOT_FOUND) {
      const found = matchNotFound(error.message)
      if (found) {
        return {
          code: error.code ?? "not_found",
          type: error.type,
          message: messages.notFoundTemplate
            .replace("{entity}", found.entity)
            .replace("{id}", found.id),
        }
      }
    }

    return {
      code: error.code ?? "unknown_error",
      type: error.type,
      message: typeFallbackFor(error.type, messages),
    }
  }

  return {
    code: "unknown_error",
    type: "unknown_error",
    message: messages.genericUnexpected,
  }
}
