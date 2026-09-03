import { errorHandler as defaultErrorHandler } from "@medusajs/framework/http"
import type { MedusaErrorHandlerFunction } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { resolveKayiLogger } from "../logger"
import { resolveVendorLanguage } from "./languages"
import { translateVendorError } from "./translate-error"

const fallbackErrorHandler = defaultErrorHandler()

/**
 * Mirrors the status-code switch in
 * `@medusajs/framework/dist/http/middlewares/error-handler.js` so a
 * translated vendor response keeps the exact same HTTP status the default
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
 * Replaces Medusa's default error handler only for `/vendor/*` and
 * `/auth/seller/*` / `/auth/member/*` requests (see
 * middlewares.ts::scopedErrorHandler for why those are included — the vendor
 * panel's own login/register calls use `$actorType: "member"`) whose
 * `Accept-Language` resolves to a supported, non-English vendor panel
 * language — everything else (admin, store, and vendor-auth requests with
 * no/English language) is delegated untouched to `defaultErrorHandler`.
 */
export const vendorAwareErrorHandler: MedusaErrorHandlerFunction = (
  error,
  req,
  res,
  next
) => {
  const isVendorScoped =
    req.path.startsWith("/vendor") ||
    req.path.startsWith("/auth/seller") ||
    req.path.startsWith("/auth/member")
  if (!isVendorScoped || !(error instanceof Error)) {
    fallbackErrorHandler(error, req, res, next)
    return
  }

  const language = resolveVendorLanguage(req.headers["accept-language"])
  if (language === "en") {
    fallbackErrorHandler(error, req, res, next)
    return
  }

  const translated = translateVendorError(error, language)

  const logger = resolveKayiLogger(req.scope)
  if (statusCodeFor(translated.type) >= 500) {
    logger.error(`[vendor-error-i18n:${language}] ${error.message}`)
  } else {
    logger.info(`[vendor-error-i18n:${language}] ${error.message}`)
  }

  res.status(statusCodeFor(translated.type)).json(translated)
}
