import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
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
 * Vendor session'ı doğrulanmış kullanıcıya messenger servisi için
 * kısa süreli bir JWT token döner. Bu token, messenger backend'in
 * kullandığı aynı JWT_SECRET ile imzalanır.
 *
 * Kimlik çözümü:
 * - req.auth_context.actor_id vendor route'larında MEMBER kimliğidir
 *   ("mem_xxx"), seller kimliği değil — bkz. ensure-seller-middleware.ts
 *   (`const memberId = req.auth_context.actor_id`). Gerçek seller kimliği
 *   `req.seller_context.seller_id` alanındadır (ensureSellerMiddleware
 *   tarafından `x-seller-id` header + seller_member link doğrulamasıyla
 *   çözülür). Bu route önceden yanlışlıkla actor_id'yi seller kimliği
 *   sanıyordu; canlı testte satıcı kendi konuşmasında 403 alıyordu.
 *
 * Güvenlik:
 * - Medusa'nın vendor session middleware'i tarafından auth korumalıdır
 * - Token 8 saatte sona erer
 * - Payload yalnızca messenger'ın ihtiyacı olan alanları içerir
 */
type MessengerTokenResponse = { token: string } | { error: string }

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<MessengerTokenResponse>
): Promise<void> {
  const sellerId = req.seller_context?.seller_id

  if (!sellerId) {
    res.status(401).json({ error: "Authenticated seller not found" })
    return
  }

  const payload = {
    sub: sellerId,
    actor_id: sellerId,
    actor_type: "seller",
  }

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" })

  res.json({ token })
}
