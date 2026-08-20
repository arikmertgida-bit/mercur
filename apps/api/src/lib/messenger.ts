/**
 * Server-to-server helper for notifying kayi-messenger from the backend.
 * Uses an internal secret key — never exposed to the frontend.
 */

import { getCatchMessage } from "./errors"
import { JsonRecord } from "./graph-schemas"
import { moduleKayiLogger } from "./logger"

const MESSENGER_URL =
  process.env.MESSENGER_INTERNAL_URL || "http://messenger:4000"

if (!process.env.MESSENGER_INTERNAL_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[messenger] MESSENGER_INTERNAL_SECRET env variable must be set in production")
  }
  moduleKayiLogger.warn(
    "[messenger] MESSENGER_INTERNAL_SECRET is not set — using insecure default. Set it in your .env file."
  )
}

const INTERNAL_SECRET =
  process.env.MESSENGER_INTERNAL_SECRET ?? "kayi-internal-secret"

/**
 * Canonical `sourceUserId` for system-initiated messenger notifications
 * (admin resolving a report, admin processing a request, a guest order with
 * no real customer id, ...). Using one fixed identity — rather than the
 * specific admin actor's id — keeps every such notification in a single
 * "Destek" (ADMIN_SUPPORT) thread per seller instead of fragmenting into one
 * thread per acting admin.
 */
export const ADMIN_SYSTEM_ID = "admin-system"

interface NotifyParams {
  /** User id to deliver the notification to */
  targetUserId: string
  /** Medusa actor type for the target */
  targetUserType: "CUSTOMER" | "SELLER" | "ADMIN"
  /** Display name shown in the browser notification */
  senderName?: string
  /** Short notification text */
  preview: string
  /** If provided, also persists a system message in this conversation */
  conversationId?: string
  /** Used to auto-find/create a conversation when conversationId is omitted */
  sourceUserId?: string
  sourceUserType?: "CUSTOMER" | "SELLER" | "ADMIN"
  subject?: string
  /** Conversation type when auto-creating: DIRECT (default) or ADMIN_SUPPORT (one-way) */
  conversationType?: "DIRECT" | "ADMIN_SUPPORT"
  /** Store inquiry vs product inquiry thread classification in messenger */
  contextType?: "VENDOR_BASED" | "PRODUCT_BASED"
  /** Notification type emitted to the client socket (e.g. "review_notification", "new_message") */
  notificationType?: string
  /** Message type to persist (default: NOTIFICATION). Use PROMOTION for promotion broadcasts. */
  messageType?: "TEXT" | "IMAGE" | "NOTIFICATION" | "PROMOTION"
  /** Structured payload attached to the persisted message (e.g. promotion card data). */
  metadata?: JsonRecord
  /** Sets the auto-created Conversation's `productId` column (also flips contextType to PRODUCT_BASED unless contextType is set explicitly). */
  productId?: string
  /**
   * Sets the auto-created Conversation's `metadata` — the storefront's
   * `ProductContextCard` reads this (`{ type: "product", product_id, ... }`)
   * to render a product/store card at the top of the thread without an
   * extra API call. Distinct from `metadata` above, which is per-message.
   */
  conversationMetadata?: JsonRecord
}

/**
 * Sends a real-time notification to a user via kayi-messenger.
 * Returns true when the messenger accepted the request.
 */
export async function notifyMessengerUser(params: NotifyParams): Promise<boolean> {
  try {
    const response = await fetch(`${MESSENGER_URL}/api/internal/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      moduleKayiLogger.warn(`[messenger] notify failed (${response.status}): ${text}`)
      return false
    }

    return true
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    moduleKayiLogger.warn(`[messenger] notify error: ${message}`)
    return false
  }
}

/**
 * GDPR/KVKK "right to be forgotten" — notifies kayi-messenger when a
 * customer or seller member is deleted. Messenger anonymizes all of that
 * user's message content (the conversation structure is kept, no rows are
 * deleted).
 * Returns true when the messenger accepted the request.
 */
export async function anonymizeMessengerUser(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`${MESSENGER_URL}/api/internal/gdpr/anonymize-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify({ userId }),
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      moduleKayiLogger.warn(`[messenger] gdpr anonymize-user failed (${response.status}): ${text}`)
      return false
    }

    return true
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    moduleKayiLogger.warn(`[messenger] gdpr anonymize-user error: ${message}`)
    return false
  }
}
