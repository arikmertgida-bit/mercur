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
 * Admin session'ı doğrulanmış kullanıcıya messenger servisi için
 * kısa süreli bir JWT token döner. Bu token, messenger backend'in
 * kullandığı aynı JWT_SECRET ile imzalanır.
 *
 * Güvenlik:
 * - Medusa'nın admin session middleware'i tarafından auth korumalıdır
 * - Token 8 saatte sona erer
 * - Payload yalnızca messenger'ın ihtiyacı olan alanları içerir
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
