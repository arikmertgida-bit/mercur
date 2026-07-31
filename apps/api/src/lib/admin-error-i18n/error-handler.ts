import { errorHandler as defaultErrorHandler } from "@medusajs/framework/http"
import type { MedusaErrorHandlerFunction } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { resolveKayiLogger } from "../logger"
import { resolveAdminLanguage } from "./languages"
import { translateAdminError } from "./translate-error"

const fallbackErrorHandler = defaultErrorHandler()

/**
 * Mirrors the status-code switch in
 * `@medusajs/framework/dist/http/middlewares/error-handler.js` so a
 * translated admin response keeps the exact same HTTP status the default
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
 * Replaces Medusa's default error handler only for `/admin/*` requests
 * whose `Accept-Language` resolves to a supported, non-English admin
 * panel language — everything else (store, vendor, and admin requests with
 * no/English language) is delegated untouched to `defaultErrorHandler`.
 */
export const adminAwareErrorHandler: MedusaErrorHandlerFunction = (
  error,
  req,
  res,
  next
) => {
  if (!req.path.startsWith("/admin") || !(error instanceof Error)) {
    fallbackErrorHandler(error, req, res, next)
    return
  }

  const language = resolveAdminLanguage(req.headers["accept-language"])
  if (language === "en") {
    fallbackErrorHandler(error, req, res, next)
    return
  }

  const translated = translateAdminError(error, language)

  const logger = resolveKayiLogger(req.scope)
  if (statusCodeFor(translated.type) >= 500) {
    logger.error(`[admin-error-i18n:${language}] ${error.message}`)
  } else {
    logger.info(`[admin-error-i18n:${language}] ${error.message}`)
  }

  res.status(statusCodeFor(translated.type)).json(translated)
}
