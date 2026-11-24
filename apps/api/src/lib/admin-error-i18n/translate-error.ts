import { MedusaError } from "@medusajs/framework/utils"

import {
  PRODUCT_INVENTORY_ITEM_NOT_SELLER_CODE,
  PRODUCT_MOVE_NAMES_SEPARATOR,
  PRODUCT_MOVE_RESERVED_STOCK_CODE,
  PRODUCT_MOVE_SELLER_PRICE_LISTS_CODE,
  PRODUCT_MOVE_SELLER_PROMOTIONS_CODE,
  PRODUCT_SELLER_REQUIRED_CODE,
  PRODUCT_SELLER_UNCHANGED_CODE,
  PRODUCT_SHIPPING_PROFILE_NOT_SELLER_CODE,
  PRODUCT_STOCK_LOCATION_NOT_SELLER_CODE,
} from "@mercurjs/core/api/utils/admin-error-codes"

import { AUTOMATIC_PROMOTION_ATTRIBUTE_BUDGET_CODE } from "../campaign-budget-attribute"
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
 * Product ↔ seller errors from packages/core admin-error-codes. The two "still
 * used by the old seller" errors keep the promotion codes / price list titles
 * the core message lists after PRODUCT_MOVE_NAMES_SEPARATOR.
 */
function productSellerCodeMessage(
  code: string | undefined,
  message: string,
  customCodes: AdminErrorCustomCodes
): string | null {
  const names = (): string => {
    const index = message.indexOf(PRODUCT_MOVE_NAMES_SEPARATOR)
    return index === -1
      ? ""
      : message.slice(index + PRODUCT_MOVE_NAMES_SEPARATOR.length)
  }

  switch (code) {
    case PRODUCT_SELLER_REQUIRED_CODE:
      return customCodes.product_seller_required
    case PRODUCT_SELLER_UNCHANGED_CODE:
      return customCodes.product_seller_unchanged
    case PRODUCT_SHIPPING_PROFILE_NOT_SELLER_CODE:
      return customCodes.product_shipping_profile_not_seller
    case PRODUCT_STOCK_LOCATION_NOT_SELLER_CODE:
      return customCodes.product_stock_location_not_seller
    case PRODUCT_INVENTORY_ITEM_NOT_SELLER_CODE:
      return customCodes.product_inventory_item_not_seller
    case PRODUCT_MOVE_RESERVED_STOCK_CODE:
      return customCodes.product_move_reserved_stock
    case PRODUCT_MOVE_SELLER_PROMOTIONS_CODE:
      return customCodes.product_move_seller_promotions.replace("{names}", names())
    case PRODUCT_MOVE_SELLER_PRICE_LISTS_CODE:
      return customCodes.product_move_seller_price_lists.replace("{names}", names())
    default:
      return null
  }
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
 * types — a translated generic sentence per type (a "not found" names no
 * entity: Medusa's English model names such as "ProductVariant" cannot be
 * inflected correctly in every language); (3) anything unmodeled —
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

    if (error.code === AUTOMATIC_PROMOTION_ATTRIBUTE_BUDGET_CODE) {
      return {
        code: error.code,
        type: error.type,
        message: messages.customCodes.automatic_promotion_attribute_budget,
      }
    }

    const productSellerMessage = productSellerCodeMessage(
      error.code,
      error.message,
      messages.customCodes
    )
    if (error.code && productSellerMessage) {
      return {
        code: error.code,
        type: error.type,
        message: productSellerMessage,
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
