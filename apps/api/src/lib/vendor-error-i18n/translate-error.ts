import { MedusaError } from "@medusajs/framework/utils"

import type { VendorLanguage } from "./languages"
import { VENDOR_ERROR_MESSAGES, VendorErrorCustomCodes, VendorErrorMessages } from "./messages"

export interface TranslatedVendorError {
  code: string
  type: string
  message: string
}

const VALIDATION_PREFIX = "Invalid request: "
const CUSTOM_CODE_PREFIX = "vendor_error."

/**
 * Matches a bare camelCase identifier (`"duplicateOrderReview"`,
 * `"orderNotFound"`) with no spaces or punctuation — the shape this
 * codebase's own `MedusaError(type, "someCode")` throws use, distinct from
 * a human sentence. The storefront's `backend-error-mapper.ts` and the
 * dashboards match these exact strings against their own translated code
 * catalog, so translating one here would only ever destroy a more precise,
 * already-localized frontend message in favor of a generic one. A plain
 * English MedusaError ("Unauthorized", "Not allowed") never matches: this
 * requires an uppercase letter after the first character, which those
 * don't have.
 */
const CODE_LIKE_MESSAGE = /^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/

/**
 * Matches the exact validator message we set via `.refine({ message })` in
 * packages/core/src/api/vendor/{products,shipping-options}/validators.ts.
 */
function customCodeMessage(
  segment: string,
  customCodes: VendorErrorCustomCodes
): string | null {
  if (!segment.startsWith(CUSTOM_CODE_PREFIX)) {
    return null
  }

  const key = segment.slice(CUSTOM_CODE_PREFIX.length)
  switch (key) {
    case "variant_axis_multi_select_only":
      return customCodes.variant_axis_multi_select_only
    case "inline_attribute_requires_type":
      return customCodes.inline_attribute_requires_type
    case "shipping_option_type_xor_required":
      return customCodes.shipping_option_type_xor_required
    case "shipping_option_type_mutually_exclusive":
      return customCodes.shipping_option_type_mutually_exclusive
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
  messages: VendorErrorMessages
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
  messages: VendorErrorMessages
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

function typeFallbackFor(type: string, messages: VendorErrorMessages): string {
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
export function translateVendorError(
  error: Error,
  language: VendorLanguage
): TranslatedVendorError {
  const messages = VENDOR_ERROR_MESSAGES[language]

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
