import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"

const rawJwtSecret = process.env.JWT_SECRET
if (!rawJwtSecret) {
  throw new Error("[messenger-token] JWT_SECRET environment variable is not set")
}
const JWT_SECRET: string = rawJwtSecret

/**
 * GET /store/auth/messenger-token
 *
 * Returns a short-lived JWT for the authenticated customer to use with
 * kayi-messenger. Same approach as the vendor and admin panel routes.
 *
 * Security:
 * - Protected by the authenticate("customer", ["session", "bearer"]) middleware
 * - Token expires in 8 hours
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const actorId = req.auth_context?.actor_id
  const actorType = req.auth_context?.actor_type ?? "customer"

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
