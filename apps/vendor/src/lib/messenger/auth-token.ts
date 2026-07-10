export const KAYI_MESSENGER_AUTH_TOKEN_KEY = "kayi_messenger_auth_token" as const

import { z } from "zod"

const ExpPayloadSchema = z.object({
  exp: z.number().optional(),
})

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return true
    const payloadPart = parts[1]
    if (!payloadPart) return true
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/")
    const raw = window.atob(base64)
    const parsed = ExpPayloadSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return true
    const exp = parsed.data.exp
    if (exp === undefined) return false
    const nowSeconds = Math.floor(Date.now() / 1000)
    return exp - nowSeconds < 60
  } catch {
    return true
  }
}

export function getMessengerAuthToken(): string | null {
  const token = window.localStorage.getItem(KAYI_MESSENGER_AUTH_TOKEN_KEY)
  if (!token) {
    return null
  }
  if (isTokenExpired(token)) {
    window.localStorage.removeItem(KAYI_MESSENGER_AUTH_TOKEN_KEY)
    return null
  }
  return token
}

export function setMessengerAuthToken(token: string): void {
  window.localStorage.setItem(KAYI_MESSENGER_AUTH_TOKEN_KEY, token)
}
