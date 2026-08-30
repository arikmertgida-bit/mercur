import jwt from "jsonwebtoken"

import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

const CODE_RESERVATION_TTL = "30m"

type CodeReservationPayload = {
  seller_id: string
  code: string
}

const resolveJwtSecret = (container: MedusaContainer): string => {
  const configModule = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
  const { jwtSecret } = configModule.projectConfig.http

  if (!jwtSecret || typeof jwtSecret !== "string") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "JWT secret is not configured"
    )
  }

  return jwtSecret
}

/**
 * Signs a short-lived, seller-scoped token binding a previewed promotion
 * code to the seller it was generated for. The code itself was never
 * chosen by the seller — it came from generateUniquePromotionCode — this
 * token just lets the vendor UI show that exact code and carry it through
 * to the actual creation call without ever exposing a raw, freely-settable
 * `code` field on the create endpoint.
 */
export const issueCodeReservationToken = (
  container: MedusaContainer,
  payload: CodeReservationPayload
): string => {
  const jwtSecret = resolveJwtSecret(container)

  return jwt.sign(payload, jwtSecret, { expiresIn: CODE_RESERVATION_TTL })
}

/**
 * Returns the reserved code only for a genuine, unexpired token this
 * server issued to this exact seller. Any other case (bad signature,
 * expired, wrong seller, malformed payload) returns null rather than
 * throwing — an abandoned or stale preview must never block promotion
 * creation, it just falls back to generating a fresh code.
 */
export const verifyCodeReservationToken = (
  container: MedusaContainer,
  token: string,
  sellerId: string
): string | null => {
  const jwtSecret = resolveJwtSecret(container)

  let decoded: string | jwt.JwtPayload

  try {
    decoded = jwt.verify(token, jwtSecret)
  } catch {
    return null
  }

  if (typeof decoded === "string") {
    return null
  }

  const { seller_id: tokenSellerId, code } = decoded

  if (typeof tokenSellerId !== "string" || typeof code !== "string") {
    return null
  }

  if (tokenSellerId !== sellerId) {
    return null
  }

  return code
}
