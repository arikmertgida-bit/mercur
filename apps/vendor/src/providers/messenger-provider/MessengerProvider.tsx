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
import { client } from "../../lib/client"
import {
  connectSocket,
  disconnectSocket,
  joinConversation,
  leaveConversation,
  emitTypingStart,
  emitTypingStop,
  emitMessagesRead,
} from "../../lib/messenger/socket"
import {
  getConversations,
  getMessages,
  getUnreadCount,
  findOrCreateConversation,
  markConversationRead,
  sendMessage as apiSendMessage,
  uploadImage as apiUploadImage,
  deleteMessage as apiDeleteMessage,
  deleteConversation as apiDeleteConversation,
} from "../../lib/messenger/client"
import { getMessengerAuthToken, setMessengerAuthToken } from "../../lib/messenger/auth-token"
import i18next from "i18next"
import { kayiEventManager } from "../../lib/messenger/KayiEventManager"
import {
  getMessengerVendorSnapshot,
  publishMessengerVendorState,
  subscribeMessengerVendorState,
} from "../../lib/messenger/MessengerVendorBridge"
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
import { REVIEW_NOTIFICATION_TYPE } from "../../lib/messenger/types"
import { logger } from "../../lib/logger"
import { getCatchMessage } from "../../lib/errors"

// ── Context ────────────────────────────────────────────────────────────────

export type { MessengerContextValue } from "../../lib/messenger/types"

const MessengerContext = createContext<MessengerContextValue | null>(null)

export function useMessengerUnreads(): Array<{ unreadMessageCount: number }> {
  const ctx = useContext(MessengerContext)
  const count = ctx?.unreadCount ?? 0
  return Array.from({ length: count }, () => ({ unreadMessageCount: 1 }))
}

/**
 * Returns unread count only for ADMIN_SUPPORT conversations.
 * Used by the Support button in the header so its badge reflects only
 * admin-support messages, not customer traffic.
 */
export function useMessengerAdminUnreads(): Array<{ unreadMessageCount: number }> {
  const ctx = useContext(MessengerContext)
  if (!ctx) return []
  const { conversations } = ctx
  const count = conversations
    .filter((c) => c.type === "ADMIN_SUPPORT")
    .reduce((sum, c) => {
      const selfParticipant = c.participants.find((p) => p.userType === "SELLER")
      return sum + (selfParticipant?.unreadCount ?? 0)
    }, 0)
  return Array.from({ length: count }, () => ({ unreadMessageCount: 1 }))
}

export function useMessenger(): MessengerContextValue {
  const ctx = useContext(MessengerContext)
  const bridged = useSyncExternalStore(
    subscribeMessengerVendorState,
    getMessengerVendorSnapshot,
    getMessengerVendorSnapshot
  )
  if (ctx) {
    return ctx
  }
  if (bridged) {
    return bridged
  }
  throw new Error("useMessenger must be used inside MessengerProvider or after session bootstrap")
}

// ── Provider ───────────────────────────────────────────────────────────────

interface MessengerProviderProps {
  children: React.ReactNode
  sellerId: string | null
  sellerName?: string
  persistSession?: boolean
}

const MessengerTokenResponseSchema = z.object({ token: z.string().optional() })

/**
 * JWT payload'ı decode ederek içindeki `actor_id` ve `exp` claim'lerini döner.
 * İmzayı doğrulamaz (client-side'da secret yok); yalnızca format ve süre kontrolü.
 */
const JwtPayloadSchema = z.object({
  sub: z.string().optional(),
  actor_id: z.string().optional(),
  exp: z.number().optional(),
})

function decodeJwtPayload(
  token: string
): z.infer<typeof JwtPayloadSchema> | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const part = parts[1]
    if (!part) return null
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/")
    const jsonStr = atob(base64)
    const raw = JSON.parse(jsonStr)
    const parsed = JwtPayloadSchema.safeParse(raw)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

/**
 * Mevcut localStorage token'ının yeniden kullanılabilir olup olmadığını kontrol eder.
 */
function isStoredTokenValid(): boolean {
  const token = getMessengerAuthToken()
  if (!token) return false
  const payload = decodeJwtPayload(token)
  if (!payload) return false
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (payload.exp !== undefined && payload.exp - nowSeconds < 300) return false
  const actorId = payload.actor_id ?? payload.sub
  if (!actorId || !actorId.startsWith("sel_")) return false
  return true
}

/**
 * Vendor session'ı (HttpOnly cookie) doğrulanmış satıcıya messenger servisi
 * için kısa süreli bir JWT token döner.
 */
async function fetchMessengerToken(): Promise<string | null> {
  try {
    const raw = await client.vendor.auth.messengerToken.query()
    const parsed = MessengerTokenResponseSchema.safeParse(raw)
    return parsed.success ? (parsed.data.token ?? null) : null
  } catch {
    return null
  }
}

export function MessengerProvider({
  children,
  sellerId,
  sellerName,
  persistSession = false,
}: MessengerProviderProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([])
  const [pinnedConvId, setPinnedConvId] = useState<string | null>(null)
  const [typingUserIds, setTypingUserIds] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeConvRef = useRef<string | null>(null)
  const pinnedConvIdRef = useRef<string | null>(null)
  const conversationsRef = useRef<Conversation[]>([])

  activeConvRef.current = activeConversationId
  pinnedConvIdRef.current = pinnedConvId
  conversationsRef.current = conversations

  useEffect((): void => {
    kayiEventManager.emitUnreadCount(unreadCount)
  }, [unreadCount])

  const showBrowserNotification = useCallback((payload: NotificationPayload) => {
    if (typeof window === "undefined") return
    if (document.visibilityState === "visible") return
    if (Notification.permission !== "granted") return
    new Notification(i18next.t("messenger.notificationTitle", { senderName: payload.senderName }), {
      body: payload.preview,
      icon: "/favicon.ico",
    })
  }, [])

  useEffect(() => {
    if (!sellerId) return

    let cancelled = false
    let socketInstance: ReturnType<typeof connectSocket> | null = null

    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)

    const onMessage = (msg: Message) => {
      if (msg.conversationId === activeConvRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      }
      if (msg.conversationId === pinnedConvIdRef.current) {
        setPinnedMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      }
      const isActiveAnywhere =
        msg.conversationId === activeConvRef.current ||
        msg.conversationId === pinnedConvIdRef.current
      if (!isActiveAnywhere && msg.senderId !== sellerId) {
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
          // Never bump the seller's own per-conversation unread badge for a
          // message the seller just sent — only an incoming message should.
          const updatedParticipants =
            isActiveAnywhere || msg.senderId === sellerId
              ? c.participants
              : c.participants.map((p) =>
                  p.userType === "SELLER" ? { ...p, unreadCount: (p.unreadCount ?? 0) + 1 } : p
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
        setTypingUserIds(payload.typingUserIds.filter((id) => id !== sellerId))
      }
    }

    const onReadReceipt = (payload: ReadReceiptPayload) => {
      const applyReadAt = (prev: Message[]): Message[] =>
        prev.map((m) =>
          !m.readAt && m.senderId === sellerId ? { ...m, readAt: payload.readAt } : m
        )

      if (payload.conversationId === activeConvRef.current) {
        setMessages(applyReadAt)
      }
      if (payload.conversationId === pinnedConvIdRef.current) {
        setPinnedMessages(applyReadAt)
      }
    }

    const onUnreadCountUpdated = (payload: UnreadCountUpdatedPayload) => {
      if (typeof payload.count === "number") {
        setUnreadCount(payload.count)
        kayiEventManager.emitUnreadCount(payload.count)
      }
    }

    const onMessageDeleted = (payload: {
      messageId: string
      conversationId: string
      deleteForAll: boolean
      content?: string
    }): void => {
      const mapper = (m: Message): Message =>
        m.id === payload.messageId
          ? { ...m, content: payload.content ?? "[Bu mesaj silindi]", deletedForAll: true, imageUrl: null }
          : m

      if (payload.deleteForAll) {
        setMessages((prev: Message[]): Message[] => prev.map(mapper))
        setPinnedMessages((prev: Message[]): Message[] => prev.map(mapper))
        setConversations((prev: Conversation[]): Conversation[] =>
          prev.map((c: Conversation): Conversation =>
            c.id === payload.conversationId
              ? {
                  ...c,
                  messages: (c.messages ?? []).map(mapper),
                }
              : c
          )
        )
      } else {
        setMessages((prev: Message[]): Message[] => prev.filter((m: Message) => m.id !== payload.messageId))
        setPinnedMessages((prev: Message[]): Message[] => prev.filter((m: Message) => m.id !== payload.messageId))
        setConversations((prev: Conversation[]): Conversation[] =>
          prev.map((c: Conversation): Conversation =>
            c.id === payload.conversationId
              ? {
                  ...c,
                  messages: (c.messages ?? []).filter((m: Message) => m.id !== payload.messageId),
                }
              : c
          )
        )
      }
      const isActiveAnywhere =
        payload.conversationId === activeConvRef.current ||
        payload.conversationId === pinnedConvIdRef.current
      if (!isActiveAnywhere) {
        setUnreadCount((prev) => {
          const nextCount = Math.max(0, prev - 1)
          kayiEventManager.emitUnreadCount(nextCount)
          return nextCount
        })
      }
    }

    const onNotification = (payload: NotificationPayload) => {
      showBrowserNotification(payload)
      if (payload.type === REVIEW_NOTIFICATION_TYPE) {
        kayiEventManager.emitReviewNotification()
      }
      getConversations()
        .then((r) => {
          setConversations(r.conversations)
        })
        .catch((err): void => {
          logger.error(`Failed to get conversations on notification: ${getCatchMessage(err instanceof Error ? err : undefined)}`)
        })
    }

    const init = async () => {
      if (!isStoredTokenValid()) {
        const token = await fetchMessengerToken()
        if (cancelled) return
        if (token) {
          setMessengerAuthToken(token)
        } else {
          logger.warn("[messenger] Could not fetch messenger token — socket will not authenticate")
        }
      }

      if (cancelled) return
      socketInstance = connectSocket(sellerName)

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
        logger.error(`[MessengerProvider init] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
      })

      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {})
      }
    }

    init().catch((err) => {
      logger.error(`[MessengerProvider init] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
    })

    return () => {
      cancelled = true
      if (socketInstance) {
        socketInstance.off("connect", onConnect)
        socketInstance.off("disconnect", onDisconnect)
        socketInstance.off("message_received", onMessage)
        socketInstance.off("typing_update", onTypingUpdate)
        socketInstance.off("read_receipt", onReadReceipt)
        socketInstance.off("message_deleted", onMessageDeleted)
        socketInstance.off("notification", onNotification)
        socketInstance.off(MESSENGER_SOCKET_EVENTS.unreadCountUpdated, onUnreadCountUpdated)
      }
      if (!persistSession) {
        disconnectSocket()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, persistSession])

  const openConversation = useCallback(async (conversationId: string) => {
    if (activeConvRef.current && activeConvRef.current !== pinnedConvIdRef.current) {
      leaveConversation(activeConvRef.current)
    }
    setActiveConversationId(conversationId)
    setMessages([])
    setTypingUserIds([])
    setIsLoadingMessages(true)
    joinConversation(conversationId)
    emitMessagesRead(conversationId)

    const conv = conversationsRef.current.find((c) => c.id === conversationId)
    if (conv) {
      const selfParticipant = conv.participants.find((p) => p.userType === "SELLER")
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
                  p.userType === "SELLER" ? { ...p, unreadCount: 0 } : p
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

  const openSidebarConversation = useCallback(async (conversationId: string) => {
    setPinnedConvId(conversationId)
    setPinnedMessages([])
    joinConversation(conversationId)
    emitMessagesRead(conversationId)

    const conv = conversationsRef.current.find((c) => c.id === conversationId)
    if (conv) {
      const selfParticipant = conv.participants.find((p) => p.userType === "SELLER")
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
      setPinnedMessages([...msgs].reverse())
      await markConversationRead(conversationId)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                participants: c.participants.map((p) =>
                  p.userType === "SELLER" ? { ...p, unreadCount: 0 } : p
                ),
              }
            : c
        )
      )
    } catch (err) {
      logger.error(`[openSidebarConversation] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
    }
  }, [])

  const sendSidebarMessage = useCallback(async (content: string) => {
    if (!pinnedConvIdRef.current || !content.trim()) return
    try {
      const { message } = await apiSendMessage(pinnedConvIdRef.current, content)
      setPinnedMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev
        return [...prev, message]
      })
      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === pinnedConvIdRef.current
              ? { ...c, messages: [message], updatedAt: message.createdAt }
              : c
          )
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      )
    } catch (err) {
      logger.error(`[sendSidebarMessage] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
      throw err
    }
  }, [])

  const closeConversation = useCallback(() => {
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
      productId?: string
      orderId?: string
      metadata?: Record<string, unknown>
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

  const sendMessage = useCallback(async (content: string) => {
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

  const uploadImage = useCallback(async (file: File) => {
    if (!activeConvRef.current) return
    try {
      await apiUploadImage(activeConvRef.current, file)
    } catch (err) {
      logger.error(`[uploadImage] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
      throw err
    }
  }, [])

  const uploadSidebarImage = useCallback(
    async (file: File, getOrCreateConvId: () => Promise<string>) => {
      try {
        let convId = pinnedConvIdRef.current
        if (!convId) {
          convId = await getOrCreateConvId()
        }
        await apiUploadImage(convId, file)
      } catch (err) {
        logger.error(`[uploadSidebarImage] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
        throw err
      }
    },
    []
  )

  const deleteMessage = useCallback(async (messageId: string, deleteForAll: boolean) => {
    if (!activeConvRef.current) return
    const convId = activeConvRef.current
    if (deleteForAll) {
      const mapper = (m: Message): Message =>
        m.id === messageId
          ? { ...m, content: "[Bu mesaj silindi]", deletedForAll: true, imageUrl: null }
          : m
      setMessages((prev: Message[]): Message[] => prev.map(mapper))
      setPinnedMessages((prev: Message[]): Message[] => prev.map(mapper))
    } else {
      setMessages((prev: Message[]): Message[] => prev.filter((m: Message) => m.id !== messageId))
      setPinnedMessages((prev: Message[]): Message[] => prev.filter((m: Message) => m.id !== messageId))
    }
    await apiDeleteMessage(convId, messageId, deleteForAll).catch((err) => {
      logger.error(`[deleteMessage] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
    })
  }, [])

  const deleteSidebarMessage = useCallback(async (messageId: string, deleteForAll: boolean) => {
    if (!pinnedConvIdRef.current) return
    const convId = pinnedConvIdRef.current
    if (deleteForAll) {
      const mapper = (m: Message): Message =>
        m.id === messageId
          ? { ...m, content: "[Bu mesaj silindi]", deletedForAll: true, imageUrl: null }
          : m
      setMessages((prev: Message[]): Message[] => prev.map(mapper))
      setPinnedMessages((prev: Message[]): Message[] => prev.map(mapper))
    } else {
      setMessages((prev: Message[]): Message[] => prev.filter((m: Message) => m.id !== messageId))
      setPinnedMessages((prev: Message[]): Message[] => prev.filter((m: Message) => m.id !== messageId))
    }
    await apiDeleteMessage(convId, messageId, deleteForAll).catch((err) => {
      logger.error(`[deleteSidebarMessage] error ${getCatchMessage(err instanceof Error ? err : undefined)}`)
    })
  }, [])

  const deleteConversation = useCallback(async (conversationId: string, deleteForAll: boolean) => {
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

  const startTyping = useCallback(() => {
    if (!activeConvRef.current) return
    emitTypingStart(activeConvRef.current)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      if (activeConvRef.current) emitTypingStop(activeConvRef.current)
    }, 3000)
  }, [])

  const stopTyping = useCallback(() => {
    if (!activeConvRef.current) return
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    emitTypingStop(activeConvRef.current)
  }, [])

  const markRead = useCallback(async (conversationId: string) => {
    const conv = conversationsRef.current.find((c) => c.id === conversationId)
    if (conv) {
      const selfParticipant = conv.participants.find((p) => p.userType === "SELLER")
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

  const refreshConversations = useCallback(async () => {
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
      pinnedMessages,
      unreadCount,
      typingUserIds,
      isConnected,
      isLoadingMessages,
      openConversation,
      openSidebarConversation,
      sendSidebarMessage,
      closeConversation,
      startConversation,
      sendMessage,
      uploadImage,
      uploadSidebarImage,
      deleteMessage,
      deleteSidebarMessage,
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
      pinnedMessages,
      unreadCount,
      typingUserIds,
      isConnected,
      isLoadingMessages,
      openConversation,
      openSidebarConversation,
      sendSidebarMessage,
      closeConversation,
      startConversation,
      sendMessage,
      uploadImage,
      uploadSidebarImage,
      deleteMessage,
      deleteSidebarMessage,
      deleteConversation,
      startTyping,
      stopTyping,
      markRead,
      refreshConversations,
    ]
  )

  useEffect((): void => {
    publishMessengerVendorState(contextValue)
  }, [contextValue])

  return (
    <MessengerContext.Provider value={contextValue}>
      {children}
    </MessengerContext.Provider>
  )
}
