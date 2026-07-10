import { io, Socket } from "socket.io-client"
import { getMessengerAuthToken } from "./auth-token"
import { logger } from "../logger"

declare const __MESSENGER_URL__: string

const BASE_URL: string =
  typeof __MESSENGER_URL__ !== 'undefined' ? __MESSENGER_URL__ : "http://localhost:4000"

let socketInstance: Socket | null = null
let refCount = 0
let disconnectTimeout: ReturnType<typeof setTimeout> | null = null

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
  const token = getMessengerAuthToken()
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
