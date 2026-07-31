import { MedusaError } from "@medusajs/framework/utils"

import type { AdminLanguage } from "./languages"
import { ADMIN_ERROR_MESSAGES, AdminErrorCustomCodes, AdminErrorMessages } from "./messages"

export interface TranslatedAdminError {
  code: string
  type: string
  message: string
}

const VALIDATION_PREFIX = "Invalid request: "

/**
 * Matches the exact validator messages set via `.refine({ message })` in
 * packages/core/src/api/admin/{products,collections,product-categories}/validators.ts
 * — by literal English text (not a magic code) so those refine messages stay
 * legible, human-authored English by themselves when no translation applies
 * (no Accept-Language header, or an unsupported/English language) and the
 * request falls through to Medusa's default error handler untouched.
 */
function customCodeMessage(
  segment: string,
  customCodes: AdminErrorCustomCodes
): string | null {
  switch (segment) {
    case "Handle must contain URL safe characters":
      return customCodes.handle_invalid_format
    case "is_variant_axis is only allowed on multi_select attributes":
      return customCodes.variant_axis_multi_select_only
    case "inline non-axis attributes require an explicit type":
      return customCodes.inline_attribute_requires_type
    default:
      return null
  }
}

/**
 * Translates one `; `-joined segment of the message
 * `@medusajs/framework`'s `zodValidator` produces (see
 * `zod-helpers.js::formatError`) — the exact phrasings below are that
 * function's own output, not a guess.
 */
function translateValidationSegment(
  segment: string,
  messages: AdminErrorMessages
): string {
  const customMessage = customCodeMessage(segment, messages.customCodes)
  if (customMessage) {
    return customMessage
  }

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
  messages: AdminErrorMessages
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
 * id, seller_id: v1, v2 was not found"`) and Mercur's own hand-written
 * throws (`"X with id v was not found"`, `"X v not found"`).
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

function typeFallbackFor(type: string, messages: AdminErrorMessages): string {
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
export function translateAdminError(
  error: Error,
  language: AdminLanguage
): TranslatedAdminError {
  const messages = ADMIN_ERROR_MESSAGES[language]

  if (MedusaError.isMedusaError(error)) {
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
