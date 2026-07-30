import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"
import { z } from "zod"
import type {} from "@mercurjs/core/types/seller-context"

import { getCatchMessage } from "../../../lib/errors"
import { moduleKayiLogger } from "../../../lib/logger"

const rawJwtSecret = process.env.JWT_SECRET
if (!rawJwtSecret) {
  throw new Error("[notification-preferences] JWT_SECRET environment variable is not set")
}
const JWT_SECRET: string = rawJwtSecret

const MESSENGER_URL =
  process.env.MESSENGER_INTERNAL_URL || "http://messenger:4000"

const PreferenceEntrySchema = z.object({
  notificationType: z.string(),
  enabled: z.boolean(),
})

const PreferencesResponseSchema = z.object({
  preferences: z.array(PreferenceEntrySchema),
})

const PreferencesRequestBodySchema = z.object({
  preferences: z.array(PreferenceEntrySchema).min(1),
})

/**
 * `packages/vendor`'s Store Settings page (a core-plugin-typed sdk consumer)
 * cannot reach kayi-messenger directly — this route mints the same
 * short-lived seller JWT `vendor/auth/messenger-token` issues, and forwards
 * to messenger's own JWT-protected `/api/notifications/preferences` so the
 * preferences themselves have exactly one source of truth.
 */
function mintMessengerToken(sellerId: string): string {
  return jwt.sign(
    { sub: sellerId, actor_id: sellerId, actor_type: "seller" },
    JWT_SECRET,
    { expiresIn: "1m" }
  )
}

function requireSellerId(req: AuthenticatedMedusaRequest): string {
  const sellerId = req.seller_context?.seller_id
  if (!sellerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Authenticated seller not found"
    )
  }
  return sellerId
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const sellerId = requireSellerId(req)
  const token = mintMessengerToken(sellerId)

  try {
    const response = await fetch(`${MESSENGER_URL}/api/notifications/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Messenger returned ${response.status}`
      )
    }

    const parsed = PreferencesResponseSchema.safeParse(await response.json())
    if (!parsed.success) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Messenger returned an unexpected preferences shape"
      )
    }

    res.json(parsed.data)
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    moduleKayiLogger.warn(`[notification-preferences] GET failed: ${message}`)
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Failed to retrieve notification preferences"
    )
  }
}

/**
 * POST, not PUT: `packages/vendor`'s `fetchQuery` client helper only
 * supports GET/POST/DELETE. Forwards to messenger's PUT internally —
 * that half of the contract is ours end-to-end and unaffected.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const sellerId = requireSellerId(req)

  const parsedBody = PreferencesRequestBodySchema.safeParse(req.body)
  if (!parsedBody.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsedBody.error.errors[0]?.message ?? "Invalid request"
    )
  }

  const token = mintMessengerToken(sellerId)

  try {
    const response = await fetch(`${MESSENGER_URL}/api/notifications/preferences`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedBody.data),
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Messenger returned ${response.status}`
      )
    }

    const parsed = PreferencesResponseSchema.safeParse(await response.json())
    if (!parsed.success) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Messenger returned an unexpected preferences shape"
      )
    }

    res.json(parsed.data)
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    moduleKayiLogger.warn(`[notification-preferences] PUT failed: ${message}`)
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Failed to save notification preferences"
    )
  }
}
