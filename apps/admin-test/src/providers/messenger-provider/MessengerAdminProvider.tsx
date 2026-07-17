import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { z } from "zod"
import i18next from "i18next"
import { client } from "../../lib/client"
import { logger } from "../../lib/logger"
import { getCatchMessage } from "../../lib/errors"
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  joinConversation,
  leaveConversation,
  emitTypingStart,
  emitTypingStop,
  emitMessagesRead,
  emitDeleteMessage,
} from "../../lib/messenger/socket"
import {
  KAYI_MESSENGER_AUTH_TOKEN_KEY,
  setMessengerAuthToken,
} from "../../lib/messenger/auth-token"
import {
  getConversations,
  getMessages,
  getUnreadCount,
  markConversationRead,
  sendMessage as apiSendMessage,
  uploadImage as apiUploadImage,
  deleteMessage as apiDeleteMessage,
  deleteConversation as apiDeleteConversation,
  findOrCreateConversation,
  markAllConversationsRead,
} from "../../lib/messenger/client"
import { kayiEventManager } from "../../lib/messenger/KayiEventManager"
import {
  getMessengerAdminSnapshot,
  publishMessengerAdminState,
  subscribeMessengerAdminState,
} from "../../lib/messenger/MessengerAdminBridge"
import {
  MESSENGER_SOCKET_EVENTS,
  type UnreadCountUpdatedPayload,
} from "../../lib/messenger/socket-events"
import type {
  Conversation,
  Message,
  MessengerContextValue,
  NotificationPayload,
  ReadReceiptPayload,
  TypingUpdatePayload,
} from "../../lib/messenger/types"

const MessengerTokenResponseSchema = z.object({ token: z.string().optional() })

const JwtPayloadSchema = z.object({
  sub: z.string().optional(),
  actor_id: z.string().optional(),
  actor_type: z.string().optional(),
  exp: z.number().optional(),
})

type JwtPayload = z.infer<typeof JwtPayloadSchema>

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payloadPart = parts[1]
    if (!payloadPart) return null
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/")
    const raw = window.atob(base64)
    const jsonStr: Record<string, string | number | boolean | undefined | null> = JSON.parse(raw)
    const parsed = JwtPayloadSchema.safeParse(jsonStr)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function isStoredTokenValid(currentAdminId: string | null): boolean {
  if (!currentAdminId) return false
  const token = window.localStorage.getItem(KAYI_MESSENGER_AUTH_TOKEN_KEY)
  if (!token) return false
  const payload = decodeJwtPayload(token)
  if (!payload) return false
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (payload.exp !== undefined && payload.exp - nowSeconds < 300) return false
  const actorId = payload.actor_id ?? payload.sub
  if (!actorId || actorId !== currentAdminId) return false
  return true
}

/**
 * Fetches a short-lived messenger JWT for the currently authenticated admin
 * session. Admin auth in this app is cookie-based (see lib/client.ts), so no
 * bearer header is sent here — only the session cookie.
 */
async function fetchMessengerToken(): Promise<string | null> {
  try {
    const raw = await client.admin.custom.messengerToken.query()
    const parsed = MessengerTokenResponseSchema.safeParse(raw)
    return parsed.success ? (parsed.data.token ?? null) : null
  } catch {
    return null
  }
}

// ── Context ────────────────────────────────────────────────────────────────

export type { MessengerContextValue } from "../../lib/messenger/types"

const MessengerAdminContext = createContext<MessengerContextValue | null>(null)

export function useMessengerAdmin(): MessengerContextValue {
  const ctx = useContext(MessengerAdminContext)
  const bridged = useSyncExternalStore(
    subscribeMessengerAdminState,
    getMessengerAdminSnapshot,
    getMessengerAdminSnapshot
  )
  if (ctx) {
    return ctx
  }
  if (bridged) {
    return bridged
  }
  throw new Error("useMessengerAdmin must be used inside MessengerAdminProvider or after session bootstrap")
}

// ── Provider ───────────────────────────────────────────────────────────────

interface MessengerAdminProviderProps {
  children: React.ReactNode
  adminId: string | null
  /** When true, socket stays connected after unmount (global bootstrap). */
  persistSession?: boolean
}

export function MessengerAdminProvider({
  children,
  adminId,
  persistSession = false,
}: MessengerAdminProviderProps): React.JSX.Element {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [typingUserIds, setTypingUserIds] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(() => getSocket()?.connected ?? false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeConvRef = useRef<string | null>(null)
  const conversationsRef = useRef<Conversation[]>([])

  activeConvRef.current = activeConversationId
  conversationsRef.current = conversations

  useEffect((): void => {
    kayiEventManager.emitUnreadCount(unreadCount)
  }, [unreadCount])

  useEffect((): () => void => {
    const unsubscribe = kayiEventManager.subscribeMessagesVisited((): void => {
      setUnreadCount(0)
      setConversations((prev: Conversation[]): Conversation[] =>
        prev.map((c: Conversation): Conversation => ({
          ...c,
          participants: c.participants.map((p) =>
            p.userType === "ADMIN" ? { ...p, unreadCount: 0 } : p
          ),
        }))
      )
      markAllConversationsRead().catch((err): void => {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error(`[MessengerAdminProvider] markAllConversationsRead failed: ${msg}`)
      })
    })
    return (): void => {
      unsubscribe()
    }
  }, [])

  // Browser notification
  const showBrowserNotification = useCallback((payload: NotificationPayload): void => {
    if (typeof window === "undefined") return
    if (document.visibilityState === "visible") return
    if (Notification.permission !== "granted") return
    new Notification(i18next.t("messenger.notificationTitle", { senderName: payload.senderName }), {
      body: payload.preview,
      icon: "/favicon.ico",
    })
  }, [])

  useEffect(() => {
    if (!adminId) return

    let cancelled = false
    let socketInstance: ReturnType<typeof connectSocket> | null = null

    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)

    const onMessage = (msg: Message) => {
      const isActiveConv = msg.conversationId === activeConvRef.current
      if (isActiveConv) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      }
      if (!isActiveConv && msg.senderId !== adminId) {
        setUnreadCount((prev) => {
          const nextCount = prev + 1
          kayiEventManager.emitUnreadCount(nextCount)
          return nextCount
        })
      }
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === msg.conversationId)
        if (!exists) {
          getConversations()
            .then((r) => {
              setConversations(r.conversations)
            })
            .catch((err): void => {
              logger.error(`Failed to get conversations on message: ${getCatchMessage(err instanceof Error ? err : undefined)}`)
            })
          return prev
        }
        const updated = prev.map((c) => {
          if (c.id !== msg.conversationId) return c
          const updatedParticipants = isActiveConv
            ? c.participants
            : c.participants.map((p) =>
                p.userType === "ADMIN" ? { ...p, unreadCount: (p.unreadCount ?? 0) + 1 } : p
              )
          return {
            ...c,
            messages: [msg],
            updatedAt: msg.createdAt,
            participants: updatedParticipants,
          }
        })
        return updated.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      })
    }

    const onTypingUpdate = (payload: TypingUpdatePayload) => {
      if (payload.conversationId === activeConvRef.current) {
        setTypingUserIds(payload.typingUserIds.filter((id) => id !== adminId))
      }
    }

    const onReadReceipt = (payload: ReadReceiptPayload) => {
      if (payload.conversationId === activeConvRef.current) {
        setMessages((prev) =>
          prev.map((m) =>
            !m.readAt && m.senderId === adminId ? { ...m, readAt: payload.readAt } : m
          )
        )
      }
    }

    const onMessageDeleted = (payload: {
      messageId: string
      conversationId: string
      deleteForAll: boolean
    }) => {
      setMessages((prev) => prev.filter((m) => m.id !== payload.messageId))
      if (payload.deleteForAll) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === payload.conversationId
              ? {
                  ...c,
                  messages: (c.messages ?? []).filter((m: Message) => m.id !== payload.messageId),
                }
              : c
          )
        )
      }
      const isActiveConv = payload.conversationId === activeConvRef.current
      if (!isActiveConv) {
        setUnreadCount((prev) => {
          const nextCount = Math.max(0, prev - 1)
          kayiEventManager.emitUnreadCount(nextCount)
          return nextCount
        })
      }
    }

    const onUnreadCountUpdated = (payload: UnreadCountUpdatedPayload) => {
      if (typeof payload.count === "number") {
        setUnreadCount(payload.count)
        kayiEventManager.emitUnreadCount(payload.count)
      }
    }

    const onNotification = (payload: NotificationPayload) => {
      showBrowserNotification(payload)
      getConversations()
        .then((r) => {
          setConversations(r.conversations)
        })
        .catch((err): void => {
          logger.error(`Failed to get conversations on notification: ${getCatchMessage(err instanceof Error ? err : undefined)}`)
        })
    }

    const init = async () => {
      if (!isStoredTokenValid(adminId)) {
        const token = await fetchMessengerToken()
        if (cancelled) return
        if (token) {
          setMessengerAuthToken(token)
        } else {
          logger.warn("[messenger] Could not fetch messenger token — socket will not authenticate")
        }
      }

      if (cancelled) return
      socketInstance = connectSocket("Kayı.com")

      if (socketInstance.connected) {
        setIsConnected(true)
      }

      socketInstance.on("connect", onConnect)
      socketInstance.on("disconnect", onDisconnect)
      socketInstance.on("message_received", onMessage)
      socketInstance.on("typing_update", onTypingUpdate)
      socketInstance.on("read_receipt", onReadReceipt)
      socketInstance.on("message_deleted", onMessageDeleted)
      socketInstance.on("notification", onNotification)
      socketInstance.on(MESSENGER_SOCKET_EVENTS.unreadCountUpdated, onUnreadCountUpdated)
      socketInstance.on("conversation_deleted", (payload: { conversationId: string }) => {
        setConversations((prev) => prev.filter((c) => c.id !== payload.conversationId))
      })

      Promise.all([
        getConversations().then((r) => setConversations(r.conversations)),
        getUnreadCount().then((r) => setUnreadCount(r.count)),
      ]).catch((err) => {
        logger.error(`[MessengerAdminProvider init] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
      })

      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {})
      }
    }

    void init()

    return () => {
      cancelled = true
      socketInstance?.off("connect", onConnect)
      socketInstance?.off("disconnect", onDisconnect)
      socketInstance?.off("message_received", onMessage)
      socketInstance?.off("typing_update", onTypingUpdate)
      socketInstance?.off("read_receipt", onReadReceipt)
      socketInstance?.off("message_deleted", onMessageDeleted)
      socketInstance?.off("notification", onNotification)
      socketInstance?.off(MESSENGER_SOCKET_EVENTS.unreadCountUpdated, onUnreadCountUpdated)
      if (!persistSession) {
        disconnectSocket()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId, persistSession])

  const openConversation = useCallback(async (conversationId: string): Promise<void> => {
    if (activeConvRef.current) leaveConversation(activeConvRef.current)
    setActiveConversationId(conversationId)
    setMessages([])
    setTypingUserIds([])
    setIsLoadingMessages(true)
    joinConversation(conversationId)
    emitMessagesRead(conversationId)

    const conv = conversationsRef.current.find((c) => c.id === conversationId)
    if (conv) {
      const selfParticipant = conv.participants.find((p) => p.userType === "ADMIN")
      const convUnread = selfParticipant?.unreadCount ?? 0
      if (convUnread > 0) {
        setUnreadCount((prev) => {
          const nextCount = Math.max(0, prev - convUnread)
          kayiEventManager.emitUnreadCount(nextCount)
          return nextCount
        })
      }
    }

    try {
      const { messages: msgs } = await getMessages(conversationId)
      setMessages([...msgs].reverse())
      await markConversationRead(conversationId)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                participants: c.participants.map((p) =>
                  p.userType === "ADMIN" ? { ...p, unreadCount: 0 } : p
                ),
              }
            : c
        )
      )
    } catch (err) {
      logger.error(`[openConversation] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [])

  const closeConversation = useCallback((): void => {
    if (activeConvRef.current) leaveConversation(activeConvRef.current)
    setActiveConversationId(null)
    setMessages([])
    setTypingUserIds([])
  }, [])

  const startConversation = useCallback(
    async (params: {
      targetUserId: string
      targetUserType: string
      type?: "DIRECT" | "ADMIN_SUPPORT"
      subject?: string
    }): Promise<string> => {
      try {
        const { conversation } = await findOrCreateConversation(params)
        setConversations((prev) => {
          const exists = prev.find((c) => c.id === conversation.id)
          return exists ? prev : [conversation, ...prev]
        })
        return conversation.id
      } catch (err) {
        logger.error(`[startConversation] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
        throw err
      }
    },
    []
  )

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!activeConvRef.current) return
    try {
      const { message } = await apiSendMessage(activeConvRef.current, content)
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev
        return [...prev, message]
      })
    } catch (err) {
      logger.error(`[sendMessage] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
      throw err
    }
  }, [])

  const uploadImage = useCallback(async (file: File): Promise<void> => {
    if (!activeConvRef.current) return
    try {
      await apiUploadImage(activeConvRef.current, file)
    } catch (err) {
      logger.error(`[uploadImage] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
      throw err
    }
  }, [])

  const deleteMessage = useCallback(async (messageId: string, deleteForAll: boolean): Promise<void> => {
    if (!activeConvRef.current) return
    const convId = activeConvRef.current
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
    emitDeleteMessage(messageId, convId, deleteForAll)
    await apiDeleteMessage(convId, messageId, deleteForAll).catch((err) => {
      logger.error(`[deleteMessage] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
    })
  }, [])

  const deleteConversation = useCallback(async (conversationId: string, deleteForAll: boolean): Promise<void> => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId))
    if (activeConvRef.current === conversationId) {
      setActiveConversationId(null)
      activeConvRef.current = null
      setMessages([])
    }
    await apiDeleteConversation(conversationId, deleteForAll).catch((err) => {
      logger.error(`[deleteConversation] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
    })
  }, [])

  const startTyping = useCallback((): void => {
    if (!activeConvRef.current) return
    emitTypingStart(activeConvRef.current)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      if (activeConvRef.current) emitTypingStop(activeConvRef.current)
    }, 3000)
  }, [])

  const stopTyping = useCallback((): void => {
    if (!activeConvRef.current) return
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    emitTypingStop(activeConvRef.current)
  }, [])

  const markRead = useCallback(async (conversationId: string): Promise<void> => {
    const conv = conversationsRef.current.find((c) => c.id === conversationId)
    if (conv) {
      const selfParticipant = conv.participants.find((p) => p.userType === "ADMIN")
      const convUnread = selfParticipant?.unreadCount ?? 0
      if (convUnread > 0) {
        setUnreadCount((prev) => {
          const nextCount = Math.max(0, prev - convUnread)
          kayiEventManager.emitUnreadCount(nextCount)
          return nextCount
        })
      }
    }

    try {
      await markConversationRead(conversationId)
      emitMessagesRead(conversationId)
    } catch (err) {
      logger.error(`[markRead] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
    }
  }, [])

  const refreshConversations = useCallback(async (): Promise<void> => {
    try {
      const [convsRes, countRes] = await Promise.all([getConversations(), getUnreadCount()])
      setConversations(convsRes.conversations)
      setUnreadCount(countRes.count)
    } catch (err) {
      logger.error(`[refreshConversations] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
    }
  }, [])

  const contextValue = useMemo(
    (): MessengerContextValue => ({
      conversations,
      activeConversationId,
      messages,
      unreadCount,
      typingUserIds,
      isConnected,
      isLoadingMessages,
      openConversation,
      closeConversation,
      startConversation,
      sendMessage,
      uploadImage,
      deleteMessage,
      deleteConversation,
      startTyping,
      stopTyping,
      markRead,
      refreshConversations,
    }),
    [
      conversations,
      activeConversationId,
      messages,
      unreadCount,
      typingUserIds,
      isConnected,
      isLoadingMessages,
      openConversation,
      closeConversation,
      startConversation,
      sendMessage,
      uploadImage,
      deleteMessage,
      deleteConversation,
      startTyping,
      stopTyping,
      markRead,
      refreshConversations,
    ]
  )

  useEffect((): void => {
    publishMessengerAdminState(contextValue)
  }, [contextValue])

  return (
    <MessengerAdminContext.Provider value={contextValue}>
      {children}
    </MessengerAdminContext.Provider>
  )
}
