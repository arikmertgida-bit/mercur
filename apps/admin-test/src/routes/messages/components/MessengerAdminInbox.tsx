import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Prompt, DropdownMenu, IconButton } from "@medusajs/ui"
import { ChatBubbleLeftRight, PaperClip, PaperPlane, EllipsisHorizontal, XMark, XMarkMini } from "@medusajs/icons"
import { useMessengerAdmin } from "../../../providers/messenger-provider/MessengerAdminProvider"
import type { Conversation, Message, MessageContext, Participant, UserType } from "../../../lib/messenger/types"
import { AdminProductSchema } from "../../../lib/messenger/schemas"
import { client } from "../../../lib/client"
import { logger } from "../../../lib/logger"
import { getCatchMessage } from "../../../lib/errors"
import { ThreadListItem } from "./ThreadListItem"
import { AdminChatHeader } from "./AdminChatHeader"
import { ProductContextCard } from "./ProductContextCard"
import { VendorContextCard } from "./VendorContextCard"
import { DynamicAvatar } from "./DynamicAvatar"
import { useAdminSellerAvatar } from "../../../hooks/api/seller-avatar"
import { useCustomerAvatar } from "../../../hooks/useCustomerAvatar"
import { resolveParticipantDisplayName } from "../../../lib/messenger/resolve-participant-display-name"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Bugün"
  if (d.toDateString() === yesterday.toDateString()) return "Dün"
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
}

function getOtherParticipant(participants: Participant[]): Participant | null {
  return participants.find((p) => p.userType !== "ADMIN") ?? null
}

function resolveOtherName(
  participant: Participant | null,
  isCustomer: boolean,
  customerFallback: string,
  unknownFallback: string
): string {
  if (!participant) return unknownFallback
  const fallback = isCustomer ? customerFallback : unknownFallback
  return resolveParticipantDisplayName(participant.displayName, fallback)
}

// ── Component ─────────────────────────────────────────────────────────────────

interface MessengerAdminInboxProps {
  adminId: string
}

export function MessengerAdminInbox({ adminId }: MessengerAdminInboxProps): React.JSX.Element {
  const {
    conversations,
    activeConversationId,
    messages,
    typingUserIds,
    isLoadingMessages,
    isConnected,
    openConversation,
    closeConversation,
    sendMessage,
    uploadImage,
    deleteMessage,
    deleteConversation,
    startTyping,
    stopTyping,
  } = useMessengerAdmin()

  const { t } = useTranslation()

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [mobileView, setMobileView] = useState<"list" | "chat">("list")
  const [text, setText] = useState("")
  const [search, setSearch] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)

  const [pendingDelete, setPendingDelete] = useState<{ messageId: string; deleteForAll: boolean } | null>(null)
  const [pendingDeleteConv, setPendingDeleteConv] = useState<{ convId: string; deleteForAll: boolean } | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  const activeConv = conversations.find((c) => c.id === activeConversationId) ?? null
  const [activeContext, setActiveContext] = useState<MessageContext | null>(null)
  const [isContextLoading, setIsContextLoading] = useState(false)

  const otherParticipant = activeConv ? getOtherParticipant(activeConv.participants) : null
  const otherParticipantType: UserType | "" = otherParticipant?.userType ?? ""
  const isOtherCustomer =
    otherParticipantType === "CUSTOMER" || !!otherParticipant?.userId?.startsWith("cus_")

  const otherName = resolveOtherName(
    otherParticipant,
    isOtherCustomer,
    t("messages.customerMessage"),
    t("messenger.unknown")
  )

  const { avatarUrl: customerAvatarUrl } = useCustomerAvatar(
    isOtherCustomer ? otherParticipant?.userId : undefined
  )

  const isOtherSeller = otherParticipantType === "SELLER"
  const { data: sellerAvatarData } = useAdminSellerAvatar(
    isOtherSeller ? otherParticipant?.userId : undefined
  )
  const sellerAvatarUrl = sellerAvatarData?.avatar_url ?? (activeConv?.metadata?.type === "store" ? activeConv.metadata.store_image : null)

  useEffect(() => {
    const conv = activeConv
    if (!conv) {
      setActiveContext(null)
      setIsContextLoading(false)
      return
    }

    if (conv.type === "ADMIN_SUPPORT") {
      setActiveContext(null)
      setIsContextLoading(false)
      return
    }

    const isProduct =
      conv.contextType === "PRODUCT_BASED" ||
      (conv.contextType !== "VENDOR_BASED" && !!conv.productId)

    if (isProduct && conv.productId) {
      const pid = conv.productId
      setIsContextLoading(true)
      client.admin.products.$id
        .query({ $id: pid })
        .then((raw) => {
          const parsed = AdminProductSchema.safeParse(raw)
          if (!parsed.success) { setActiveContext(null); return }
          setActiveContext({
            type: "PRODUCT",
            data: {
              id: pid,
              title: parsed.data.product.title,
              thumbnail: parsed.data.product.thumbnail,
              handle: parsed.data.product.handle,
            },
          })
        })
        .catch((err) => {
          logger.error(`[MessengerAdminInbox] product fetch error: ${getCatchMessage(err instanceof Error ? err : undefined)}`)
          setActiveContext(null)
        })
        .finally(() => setIsContextLoading(false))
    } else if (conv.contextType === "VENDOR_BASED") {
      setActiveContext({ type: "VENDOR", data: {} })
      setIsContextLoading(false)
    } else {
      setActiveContext(null)
      setIsContextLoading(false)
    }
  }, [activeConv?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const isOtherTyping = typingUserIds.length > 0

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      const container = messagesContainerRef.current
      if (container) container.scrollTop = container.scrollHeight
    })
    return () => cancelAnimationFrame(frameId)
  }, [messages, typingUserIds])

  const handleSend = useCallback(async () => {
    if (!activeConversationId) return

    if (pendingImage) {
      setIsSending(true)
      const file = pendingImage
      setPendingImage(null)
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview)
        setPendingImagePreview(null)
      }
      try {
        await uploadImage(file)
      } catch (err) {
        logger.error(`[MessengerAdminInbox] image upload error: ${getCatchMessage(err instanceof Error ? err : undefined)}`)
      } finally {
        setIsSending(false)
      }
      return
    }

    const content = text.trim()
    if (!content || isSending) return
    setIsSending(true)
    setText("")
    stopTyping()
    try {
      await sendMessage(content)
    } catch (err) {
      logger.error(`[MessengerAdminInbox] send error: ${getCatchMessage(err instanceof Error ? err : undefined)}`)
    } finally {
      setIsSending(false)
    }
  }, [text, pendingImage, pendingImagePreview, isSending, activeConversationId, sendMessage, stopTyping, uploadImage])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeConversationId) return
    setPendingImage(file)
    setPendingImagePreview(URL.createObjectURL(file))
    e.target.value = ""
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const el = e.target
    requestAnimationFrame(() => {
      el.style.height = "auto"
      el.style.height = `${Math.min(el.scrollHeight, 96)}px`
    })
    if (!isTypingRef.current) {
      isTypingRef.current = true
      startTyping()
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false
      stopTyping()
    }, 2000)
  }

  const handleDeleteMessage = useCallback(
    async (messageId: string, deleteForAll: boolean): Promise<void> => {
      try {
        await deleteMessage(messageId, deleteForAll)
      } catch (err) {
        logger.error(`[MessengerAdminInbox] delete message error: ${getCatchMessage(err instanceof Error ? err : undefined)}`)
      }
      setPendingDelete(null)
    },
    [deleteMessage]
  )

  const handleRequestDelete = useCallback(
    (messageId: string, deleteForAll: boolean): void => {
      setPendingDelete({ messageId, deleteForAll })
    },
    []
  )

  const handleOpenConversation = useCallback(
    (id: string): void => {
      openConversation(id)
      if (isMobile) setMobileView("chat")
    },
    [openConversation, isMobile]
  )

  const filtered: Conversation[] =
    search.length < 2
      ? conversations
      : conversations.filter((c) => {
          const q = search.toLowerCase()
          return (
            c.subject?.toLowerCase().includes(q) ||
            c.participants.some(
              (p: Participant) =>
                p.displayName?.toLowerCase().includes(q) ||
                p.userId.toLowerCase().includes(q)
            )
          )
        })

  return (
    <div className="relative h-full w-full">
      <div className="flex w-full h-full border border-ui-border-base rounded-lg overflow-hidden">
        {/* ── Conversation list ── */}
        <div
          className={`${isMobile && mobileView === "chat" ? "hidden" : "flex"} ${isMobile ? "w-full min-w-0" : "w-96 max-w-full min-w-0 flex-shrink-0"} flex-col border-r border-ui-border-base bg-ui-bg-subtle overflow-hidden`}
        >
          <div className="p-3 border-b border-ui-border-base">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-ui-fg-base">{t("messages.domain")}</p>
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-ui-tag-green-icon" : "bg-ui-fg-muted"}`}
                title={isConnected ? t("messenger.connected") : t("messenger.disconnected")}
              />
            </div>
            <label htmlFor="admin-messages-search" className="sr-only">
              {t("messenger.searchConversations")}
            </label>
            <input
              id="admin-messages-search"
              name="adminMessagesSearch"
              type="search"
              placeholder={t("messenger.searchConversations")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("messenger.searchConversations")}
              className="w-full px-2 py-1 text-sm rounded border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-ui-border-interactive"
            />
          </div>
          <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
            {filtered.length === 0 ? (
              <p className="text-center text-ui-fg-muted text-sm mt-8">
                {t("messenger.noConversations")}
              </p>
            ) : (
              filtered.map((conv) => (
                <ThreadListItem
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === activeConversationId}
                  onOpen={handleOpenConversation}
                  onDelete={(id, deleteForAll) => setPendingDeleteConv({ convId: id, deleteForAll })}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Chat panel ── */}
        {activeConv ? (
          <div className={`${isMobile && mobileView === "list" ? "hidden" : "flex"} flex-1 flex-col min-w-0 min-h-0 overflow-hidden`}>
            {/* Header */}
            <AdminChatHeader
              context={activeContext}
              otherName={otherName}
              otherParticipantType={otherParticipantType}
              customerAvatarUrl={isOtherCustomer ? customerAvatarUrl : null}
              sellerAvatarUrl={sellerAvatarUrl}
              onBack={() => { if (isMobile) setMobileView("list") }}
              onClose={() => {
                closeConversation()
                if (isMobile) setMobileView("list")
              }}
            />

            {/* Context card skeleton while loading */}
            {isContextLoading && (
              <div className="px-4 py-2 border-b border-ui-border-base flex items-center gap-3 h-[72px] flex-shrink-0 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-ui-bg-component flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-ui-bg-component rounded w-3/4" />
                  <div className="h-2 bg-ui-bg-component rounded w-1/2" />
                </div>
              </div>
            )}
            {!isContextLoading && activeContext?.type === "PRODUCT" && <ProductContextCard product={activeContext.data} />}
            {!isContextLoading && activeContext?.type === "VENDOR" && <VendorContextCard />}

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-ui-bg-subtle">
              {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="w-6 h-6 border-2 border-ui-border-interactive border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-10 h-10 rounded-full bg-ui-bg-base border border-ui-border-base flex items-center justify-center mb-3">
                    <ChatBubbleLeftRight className="w-5 h-5 text-ui-fg-muted" />
                  </div>
                  <p className="text-sm font-medium text-ui-fg-base">{otherName}</p>
                  <p className="text-xs text-ui-fg-muted mt-1">{t("messenger.startConversation")}</p>
                </div>
              ) : (
                (() => {
                  const items: React.ReactNode[] = []
                  let lastDate = ""
                  messages.forEach((msg: Message, idx: number) => {
                    const msgDate = formatDate(msg.createdAt)
                    if (msgDate !== lastDate) {
                      lastDate = msgDate
                      items.push(
                        <div key={`date-${msg.id}`} className="flex justify-center">
                          <span className="text-xs text-ui-fg-muted bg-ui-bg-base border border-ui-border-base rounded-full px-3 py-1">
                            {msgDate}
                          </span>
                        </div>
                      )
                    }
                    const isMe = msg.senderType === "ADMIN"
                    const isNotification = msg.messageType === "NOTIFICATION"
                    const prevMsg = messages[idx - 1]
                    const nextMsg = messages[idx + 1]
                    const isFirstInGroup =
                      !prevMsg ||
                      prevMsg.senderId !== msg.senderId ||
                      prevMsg.messageType === "NOTIFICATION"
                    const isLastInGroup =
                      !nextMsg ||
                      nextMsg.senderId !== msg.senderId ||
                      nextMsg.messageType === "NOTIFICATION"
                    if (isNotification) {
                      items.push(
                        <div key={msg.id} className="flex justify-center">
                          <span className="text-xs text-ui-fg-muted bg-ui-bg-base border border-ui-border-base rounded-full px-3 py-1">
                            {msg.content}
                          </span>
                        </div>
                      )
                      return
                    }
                    const myMsgs = messages.filter((m) => m.senderType === "ADMIN")
                    const isLastMine = isMe && msg.id === myMsgs[myMsgs.length - 1]?.id
                    items.push(
                      <div key={msg.id} className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        {!isMe && (
                          <div className="flex-shrink-0 mb-0.5">
                            {isLastInGroup ? (
                              otherParticipantType === "CUSTOMER" ? (
                                <DynamicAvatar src={customerAvatarUrl} alt={otherName} className="w-7 h-7" type="CUSTOMER" />
                              ) : otherParticipantType === "SELLER" ? (
                                <DynamicAvatar src={sellerAvatarUrl} alt={otherName} className="w-7 h-7" type="SELLER" />
                              ) : (
                                <DynamicAvatar src={null} alt="Kayı.com" className="w-7 h-7" type="ADMIN" />
                              )
                            ) : (
                              <div className="w-7" />
                            )}
                          </div>
                        )}
                        <div className="max-w-[65%] flex flex-col items-end gap-1">
                          <div
                            className={`rounded-2xl px-3 py-2 text-sm max-w-full ${
                              isMe
                                ? "bg-ui-button-inverted text-ui-fg-on-inverted"
                                : "bg-ui-bg-base text-ui-fg-base border border-ui-border-base"
                            }${msg.deletedForAll ? " italic opacity-70" : ""}`}
                          >
                            {!isMe && isFirstInGroup && (
                              <p className="text-xs font-medium mb-1 opacity-70">{otherName}</p>
                            )}
                            {msg.messageType === "IMAGE" && msg.imageUrl ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (msg.imageUrl) setLightboxSrc(msg.imageUrl)
                                }}
                                className="block border-0 p-0 cursor-zoom-in rounded-lg overflow-hidden"
                                aria-label={t("messages.viewImage")}
                              >
                                <img
                                  src={msg.imageUrl}
                                  alt={t("messenger.image")}
                                  className="max-w-full rounded-lg hover:opacity-90 transition-opacity"
                                />
                              </button>
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            )}
                            <p
                              className={`text-xs mt-1 opacity-60 text-right ${
                                isMe ? "text-ui-fg-on-inverted" : "text-ui-fg-muted"
                              }`}
                            >
                              {formatTime(msg.createdAt)}
                              {isMe && isLastMine && msg.readAt && (
                                <span className="ml-1">{" · "}{t("messenger.seen")}</span>
                              )}
                            </p>
                          </div>
                          {!msg.deletedForAll && (
                            <DropdownMenu>
                              <DropdownMenu.Trigger asChild>
                                <IconButton
                                  type="button"
                                  size="small"
                                  className="shadow"
                                  aria-label={t("messenger.conversationOptions")}
                                >
                                  <EllipsisHorizontal />
                                </IconButton>
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Content className="w-44 bg-ui-bg-base border border-ui-border-base rounded-xl shadow-lg p-1">
                                <DropdownMenu.Item
                                  onClick={() => handleRequestDelete(msg.id, false)}
                                  className="w-full text-left px-3 py-1.5 hover:bg-ui-bg-base-hover text-ui-fg-base transition-colors rounded-lg cursor-pointer text-sm font-medium"
                                >
                                  {t("messages.delete")}
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  disabled={msg.senderId !== adminId}
                                  onClick={() => handleRequestDelete(msg.id, true)}
                                  className="w-full text-left px-3 py-1.5 hover:bg-ui-tag-red-bg text-ui-tag-red-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg cursor-pointer text-sm font-medium"
                                >
                                  {t("messages.deleteForEveryone")}
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    )
                  })
                  return items
                })()
              )}
              {isOtherTyping && (
                <div className="flex justify-start">
                  <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl px-3 py-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-ui-fg-muted rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-ui-fg-muted rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-ui-fg-muted rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-ui-border-base bg-ui-bg-base flex flex-col gap-2">
              {!isConnected && (
                <div className="px-3 py-1.5 bg-ui-tag-orange-bg border border-ui-tag-orange-border rounded-xl text-xs text-ui-tag-orange-text flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ui-tag-orange-icon animate-pulse flex-shrink-0" />
                  {t("messages.connectionLost")}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <IconButton
                  type="button"
                  size="small"
                  variant="transparent"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0"
                  aria-label={t("messages.attachImage")}
                  aria-controls="admin-messages-image-upload"
                >
                  <PaperClip />
                </IconButton>
                <input
                  ref={fileInputRef}
                  id="admin-messages-image-upload"
                  name="adminMessagesImage"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                  aria-label={t("messages.attachImage")}
                />
                {pendingImagePreview && (
                  <div className="relative flex-shrink-0">
                    <img
                      src={pendingImagePreview}
                      alt={t("messages.pendingImageAlt")}
                      className="w-10 h-10 rounded-lg object-cover border border-ui-border-base"
                    />
                    <IconButton
                      type="button"
                      size="2xsmall"
                      className="absolute -top-1 -right-1 rounded-full bg-ui-button-inverted text-ui-fg-on-inverted hover:bg-ui-tag-red-bg hover:text-ui-tag-red-text transition-colors"
                      onClick={() => {
                        URL.revokeObjectURL(pendingImagePreview)
                        setPendingImagePreview(null)
                        setPendingImage(null)
                      }}
                      aria-label={t("messages.removeAttachment")}
                    >
                      <XMarkMini />
                    </IconButton>
                  </div>
                )}
                <label htmlFor="admin-messages-compose" className="sr-only">
                  {t("messenger.typeMessage")}
                </label>
                <textarea
                  ref={textareaRef}
                  id="admin-messages-compose"
                  name="adminMessagesCompose"
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder={t("messenger.typeMessage")}
                  aria-label={t("messenger.typeMessage")}
                  rows={1}
                  className="flex-1 px-3 py-2 text-sm rounded-2xl border border-ui-border-base bg-ui-bg-subtle text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none focus:border-ui-border-interactive resize-none leading-5 min-h-9 max-h-24 overflow-y-auto"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={(!text.trim() && !pendingImage) || isSending}
                  className="w-9 h-9 rounded-full bg-ui-button-inverted text-ui-fg-on-inverted flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
                  aria-label={t("messages.send")}
                >
                  <PaperPlane className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={`${isMobile && mobileView === "list" ? "hidden" : "flex"} flex-1 flex-col items-center justify-center text-center px-8 min-h-0`}>
            <div className="w-12 h-12 rounded-full bg-ui-bg-base border border-ui-border-base flex items-center justify-center mb-3">
              <ChatBubbleLeftRight className="w-6 h-6 text-ui-fg-muted" />
            </div>
            <p className="text-sm font-medium text-ui-fg-base mb-1">
              {t("messenger.selectConversation")}
            </p>
            <p className="text-xs text-ui-fg-muted">{t("messenger.startMessaging")}</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ui-bg-overlay"
          onClick={() => setLightboxSrc(null)}
        >
          <IconButton
            type="button"
            className="absolute top-4 right-4 text-ui-fg-on-inverted"
            onClick={() => setLightboxSrc(null)}
            aria-label={t("messages.close")}
          >
            <XMark />
          </IconButton>
          <img
            src={lightboxSrc}
            alt={t("messenger.image")}
            className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Prompt
        variant="danger"
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>{t("messages.deleteConfirmTitle")}</Prompt.Title>
            <Prompt.Description>
              {t("messages.deleteConfirmDesc")}
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel>{t("messages.close")}</Prompt.Cancel>
            <Prompt.Action
              onClick={() => {
                if (pendingDelete) {
                  handleDeleteMessage(pendingDelete.messageId, pendingDelete.deleteForAll)
                }
              }}
            >
              {t("messages.delete")}
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>

      {/* Conversation delete confirmation dialog */}
      <Prompt
        variant="danger"
        open={pendingDeleteConv !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteConv(null)
        }}
      >
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>{t("messages.deleteConfirmTitle")}</Prompt.Title>
            <Prompt.Description>
              {t("messages.deleteConfirmDesc")}
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel>{t("messages.close")}</Prompt.Cancel>
            <Prompt.Action
              onClick={() => {
                if (pendingDeleteConv) {
                  deleteConversation(pendingDeleteConv.convId, pendingDeleteConv.deleteForAll)
                  setPendingDeleteConv(null)
                }
              }}
            >
              {t("messages.delete")}
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </div>
  )
}
