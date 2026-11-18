import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import {
  MessengerActorType,
  signMessengerToken,
} from "../../../../lib/messenger-token"

/**
 * GET /admin/custom/messenger-token
 *
 * Returns a short-lived messenger token for the authenticated admin. Signed
 * for the messenger only (see lib/messenger-token), so it is not an admin
 * session for Medusa.
 *
 * Throws instead of hand-rolling `res.json({ error })` so the response goes
 * through `adminAwareErrorHandler` (apps/api/src/lib/admin-error-i18n) and
 * comes back in the admin's selected panel language.
 */
type MessengerTokenResponse = { token: string }

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<MessengerTokenResponse>
): Promise<void> {
  const actorId = req.auth_context?.actor_id

  if (!actorId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Authenticated actor not found"
    )
  }

  const token = signMessengerToken(actorId, MessengerActorType.USER, "8h")

  res.json({ token })
}
