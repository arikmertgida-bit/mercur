import { errorHandler as defaultErrorHandler } from "@medusajs/framework/http"
import type { MedusaErrorHandlerFunction } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { resolveKayiLogger } from "../logger"
import { resolveStoreLanguage } from "./languages"
import { translateStoreError } from "./translate-error"

const fallbackErrorHandler = defaultErrorHandler()

/**
 * Mirrors the status-code switch in
 * `@medusajs/framework/dist/http/middlewares/error-handler.js` so a
 * translated store response keeps the exact same HTTP status the default
 * handler would have produced for the same `MedusaError` type — only
 * `message`/`code` change.
 */
function statusCodeFor(type: string): number {
  switch (type) {
    case MedusaError.Types.CONFLICT:
      return 409
    case MedusaError.Types.UNAUTHORIZED:
      return 401
    case MedusaError.Types.FORBIDDEN:
      return 403
    case MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR:
    case MedusaError.Types.DUPLICATE_ERROR:
      return 422
    case MedusaError.Types.NOT_ALLOWED:
    case MedusaError.Types.INVALID_DATA:
      return 400
    case MedusaError.Types.NOT_FOUND:
      return 404
    default:
      return 500
  }
}

/**
 * Replaces Medusa's default error handler only for `/store/*` and
 * `/auth/customer/*` requests (see middlewares.ts::scopedErrorHandler for
 * why the latter is included) whose `Accept-Language` resolves to a
 * supported, non-English shopper language — everything else (admin,
 * vendor, and store/customer-auth requests with no/English language) is
 * delegated untouched to `defaultErrorHandler`.
 */
export const storeAwareErrorHandler: MedusaErrorHandlerFunction = (
  error,
  req,
  res,
  next
) => {
  const isStoreScoped =
    req.path.startsWith("/store") || req.path.startsWith("/auth/customer")
  if (!isStoreScoped || !(error instanceof Error)) {
    fallbackErrorHandler(error, req, res, next)
    return
  }

  const language = resolveStoreLanguage(req.headers["accept-language"])
  if (language === "en") {
    fallbackErrorHandler(error, req, res, next)
    return
  }

  const translated = translateStoreError(error, language)

  const logger = resolveKayiLogger(req.scope)
  if (statusCodeFor(translated.type) >= 500) {
    logger.error(`[store-error-i18n:${language}] ${error.message}`)
  } else {
    logger.info(`[store-error-i18n:${language}] ${error.message}`)
  }

  res.status(statusCodeFor(translated.type)).json(translated)
}
