import { z } from "zod"
import type { Conversation, Message } from "./types"
import { getMessengerAuthToken } from "./auth-token"

declare const __MESSENGER_URL__: string

const BASE_URL: string =
  typeof __MESSENGER_URL__ !== 'undefined' ? __MESSENGER_URL__ : "http://localhost:4000"

const DEFAULT_ERROR_MESSAGE = "Beklenmeyen bir sunucu hatası oluştu."

const ErrorBodySchema = z.object({ message: z.string().optional() }).passthrough()

async function extractErrorMessageFromResponse(res: Response): Promise<string> {
  const parsed = ErrorBodySchema.safeParse(await res.json().catch(() => ({})))
  if (parsed.success && typeof parsed.data.message === "string" && parsed.data.message.length > 0) {
    return parsed.data.message
  }
  return DEFAULT_ERROR_MESSAGE
}

function getAuthHeader(): Record<string, string> {
  const token = getMessengerAuthToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

interface RequestOptions {
  method?: string
  body?: string
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: options.body,
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(await extractErrorMessageFromResponse(res))
  }

  return res.json()
}

// ── Conversations ──────────────────────────────────────────────────────────

export async function getConversations(): Promise<{ conversations: Conversation[] }> {
  return request("/api/conversations")
}

export async function findOrCreateConversation(payload: {
  targetUserId: string
  targetUserType: string
  type?: "DIRECT" | "ADMIN_SUPPORT"
  subject?: string
  productId?: string
  orderId?: string
  contextType?: string
  metadata?: Record<string, unknown>
}): Promise<{ conversation: Conversation }> {
  return request("/api/conversations", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await request(`/api/conversations/${conversationId}/read`, { method: "PATCH" })
}

export async function getUnreadCount(): Promise<{ count: number }> {
  return request("/api/conversations/unread-count")
}

// ── Messages ───────────────────────────────────────────────────────────────

export async function getMessages(
  conversationId: string,
  cursor?: string
): Promise<{ messages: Message[] }> {
  const params = cursor ? `?cursor=${cursor}` : ""
  return request(`/api/conversations/${conversationId}/messages${params}`)
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<{ message: Message }> {
  return request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  })
}

// ── Image Upload ───────────────────────────────────────────────────────────

export async function uploadImage(
  conversationId: string,
  file: File
): Promise<{ message: Message; imageUrl: string }> {
  const formData = new FormData()
  formData.append("conversationId", conversationId)
  formData.append("file", file)

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers: getAuthHeader(),
    body: formData,
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error(await extractErrorMessageFromResponse(res))
  }

  return res.json()
}

// ── Message Deletion ───────────────────────────────────────────────

export async function deleteMessage(
  conversationId: string,
  messageId: string,
  deleteForAll: boolean
): Promise<void> {
  await request(`/api/conversations/${conversationId}/messages/${messageId}`, {
    method: "DELETE",
    body: JSON.stringify({ deleteForAll }),
  })
}

export async function deleteConversation(
  conversationId: string,
  deleteForAll: boolean
): Promise<void> {
  await request(`/api/conversations/${conversationId}`, {
    method: "DELETE",
    body: JSON.stringify({ deleteForAll }),
  })
}

export async function markAllConversationsRead(): Promise<void> {
  await request("/api/conversations/read-all", { method: "PATCH" })
}
