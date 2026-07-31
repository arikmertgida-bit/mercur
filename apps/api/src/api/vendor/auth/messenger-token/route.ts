import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"
import type {} from "@mercurjs/core/types/seller-context"

const rawJwtSecret = process.env.JWT_SECRET
if (!rawJwtSecret) {
  throw new Error("[messenger-token] JWT_SECRET environment variable is not set")
}
const JWT_SECRET: string = rawJwtSecret

/**
 * GET /vendor/auth/messenger-token
 *
 * Returns a short-lived JWT for the authenticated vendor session to use
 * with the messenger service. Signed with the same JWT_SECRET the
 * messenger backend uses.
 *
 * Identity resolution:
 * - req.auth_context.actor_id is the MEMBER identity on vendor routes
 *   ("mem_xxx"), not the seller identity — see ensure-seller-middleware.ts
 *   (`const memberId = req.auth_context.actor_id`). The real seller identity
 *   lives in `req.seller_context.seller_id` (resolved by
 *   ensureSellerMiddleware via the `x-seller-id` header + seller_member
 *   link validation). This route previously mistook actor_id for the
 *   seller identity — in live testing the seller got a 403 in their own
 *   conversation.
 *
 * Security:
 * - Protected by Medusa's vendor session middleware
 * - Token expires in 8 hours
 * - Payload only carries the fields messenger needs
 */
type MessengerTokenResponse = { token: string }

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<MessengerTokenResponse>
): Promise<void> {
  const sellerId = req.seller_context?.seller_id

  if (!sellerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Authenticated seller not found"
    )
  }

  const payload = {
    sub: sellerId,
    actor_id: sellerId,
    actor_type: "seller",
  }

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" })

  res.json({ token })
}
