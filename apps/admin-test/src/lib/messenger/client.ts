import type { Conversation, Message } from "./types"
import { mapUnknownBackendError } from "../backend-error-mapper"
import { getMessengerAuthToken } from "./auth-token"

declare const __MESSENGER_URL__: string

const BASE_URL: string =
  typeof __MESSENGER_URL__ !== 'undefined' ? __MESSENGER_URL__ : "http://localhost:4000"

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
    const body = await res.json().catch(() => ({}))
    throw new Error(mapUnknownBackendError(body, `HTTP ${res.status}`))
  }
  return res.json()
}

export async function getConversations(): Promise<{ conversations: Conversation[] }> {
  return request("/api/conversations?limit=100")
}

export async function getMessages(conversationId: string): Promise<{ messages: Message[] }> {
  return request(`/api/conversations/${conversationId}/messages`)
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

export async function markConversationRead(conversationId: string): Promise<void> {
  await request(`/api/conversations/${conversationId}/read`, { method: "PATCH" })
}

export async function getUnreadCount(): Promise<{ count: number }> {
  return request("/api/conversations/unread-count")
}

export async function findOrCreateConversation(payload: {
  targetUserId: string
  targetUserType: string
  type?: "DIRECT" | "ADMIN_SUPPORT"
  subject?: string
}): Promise<{ conversation: Conversation }> {
  return request("/api/conversations", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

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
    const body = await res.json().catch(() => ({}))
    throw new Error(mapUnknownBackendError(body, `HTTP ${res.status}`))
  }

  return res.json()
}

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
