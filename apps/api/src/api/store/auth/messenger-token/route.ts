import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  MessengerActorType,
  signMessengerToken,
} from "../../../../lib/messenger-token"

/**
 * GET /store/auth/messenger-token
 *
 * Returns a short-lived messenger token for the authenticated customer. It is
 * signed for the messenger only (see lib/messenger-token), so Medusa rejects
 * it as a store session.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const actorId = req.auth_context?.actor_id

  if (!actorId) {
    res.status(401).json({ error: "Authenticated actor not found" })
    return
  }

  const token = signMessengerToken(actorId, MessengerActorType.CUSTOMER, "8h")

  res.json({ token })
}
