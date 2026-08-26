import { io, Socket } from "socket.io-client"
import { logger } from "../logger"
import { getMessengerAuthToken } from "./auth-token"

declare const __MESSENGER_URL__: string

const BASE_URL: string =
  typeof __MESSENGER_URL__ !== 'undefined' ? __MESSENGER_URL__ : "http://localhost:4000"

let socketInstance: Socket | null = null
// Reference count: socket is only truly disconnected when all providers release it
let refCount = 0
let disconnectTimeout: ReturnType<typeof setTimeout> | null = null

function getToken(): string | null {
  return getMessengerAuthToken()
}

export function getSocket(): Socket | null {
  return socketInstance
}

export function connectSocket(displayName?: string | null): Socket {
  refCount++
  if (disconnectTimeout) {
    clearTimeout(disconnectTimeout)
    disconnectTimeout = null
  }
  if (socketInstance) return socketInstance

  const token = getToken()

  socketInstance = io(BASE_URL, {
    auth: { token, displayName: displayName ?? undefined },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  })

  socketInstance.on("connect", () => {
    logger.info("[messenger] Connected to socket server")
  })

  socketInstance.on("disconnect", (reason: string) => {
    logger.info(`[messenger] Disconnected: ${reason}`)
  })

  socketInstance.on("connect_error", (err: Error) => {
    logger.error(`[messenger] Connection error: ${err.message}`)
  })

  return socketInstance
}

export function disconnectSocket(): void {
  refCount = Math.max(0, refCount - 1)
  if (refCount > 0) return

  // Debounced, not immediate: a provider's effect can unmount and remount
  // back-to-back (StrictMode's dev double-invoke, or a quick re-render that
  // toggles the effect's own deps) with refCount briefly hitting 0 in
  // between. Disconnecting synchronously there tears down and immediately
  // re-opens the socket — a visible connect/disconnect flicker, and a
  // window where the vendor is invisible to the backend's presence
  // tracking. The pending disconnect is cancelled in connectSocket() above
  // if a new ref arrives inside this window, so it only ever fires for a
  // genuine "nobody needs this socket anymore" moment. Mirrors
  // apps/admin-test/src/lib/messenger/socket.ts's identical guard.
  if (disconnectTimeout) {
    clearTimeout(disconnectTimeout)
  }
  disconnectTimeout = setTimeout(() => {
    socketInstance?.disconnect()
    socketInstance = null
    disconnectTimeout = null
  }, 2000)
}

export function joinConversation(conversationId: string): void {
  socketInstance?.emit("join_conversation", conversationId)
}

export function leaveConversation(conversationId: string): void {
  socketInstance?.emit("leave_conversation", conversationId)
}

export function emitTypingStart(conversationId: string): void {
  socketInstance?.emit("typing_start", conversationId)
}

export function emitTypingStop(conversationId: string): void {
  socketInstance?.emit("typing_stop", conversationId)
}

export function emitMessagesRead(conversationId: string): void {
  socketInstance?.emit("messages_read", conversationId)
}

export function emitDeleteMessage(
  messageId: string,
  conversationId: string,
  deleteForAll: boolean
): void {
  socketInstance?.emit("delete_message", { messageId, conversationId, deleteForAll })
}
