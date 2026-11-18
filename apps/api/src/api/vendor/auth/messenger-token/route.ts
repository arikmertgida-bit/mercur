import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type {} from "@mercurjs/core/types/seller-context"

import {
  MessengerActorType,
  signMessengerToken,
} from "../../../../lib/messenger-token"

/**
 * GET /vendor/auth/messenger-token
 *
 * Returns a short-lived messenger token for the authenticated vendor session.
 * Signed for the messenger only (see lib/messenger-token), so it is not a
 * vendor session for Medusa.
 *
 * Identity: req.auth_context.actor_id is the MEMBER on vendor routes; the
 * seller the conversation belongs to is req.seller_context.seller_id
 * (resolved by ensureSellerMiddleware from x-seller-id + membership).
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

  const token = signMessengerToken(sellerId, MessengerActorType.SELLER, "8h")

  res.json({ token })
}
