import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"

const rawJwtSecret = process.env.JWT_SECRET
if (!rawJwtSecret) {
  throw new Error("[messenger-token] JWT_SECRET environment variable is not set")
}
const JWT_SECRET: string = rawJwtSecret

/**
 * GET /admin/custom/messenger-token
 *
 * Returns a short-lived JWT for the authenticated admin session to use
 * with the messenger service. Signed with the same JWT_SECRET the
 * messenger backend uses.
 *
 * Security:
 * - Protected by Medusa's admin session middleware
 * - Token expires in 8 hours
 * - Payload only carries the fields messenger needs
 */
type MessengerTokenResponse = { token: string } | { error: string }

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<MessengerTokenResponse>
): Promise<void> {
  const actorId = req.auth_context?.actor_id
  const actorType = req.auth_context?.actor_type ?? "user"

  if (!actorId) {
    res.status(401).json({ error: "Authenticated actor not found" })
    return
  }

  const payload = {
    sub: actorId,
    actor_id: actorId,
    actor_type: actorType,
  }

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" })

  res.json({ token })
}
