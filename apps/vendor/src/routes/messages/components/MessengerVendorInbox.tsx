import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Heading, Prompt, DropdownMenu, IconButton } from "@medusajs/ui"
import { ChatBubbleLeftRight, PaperClip, PaperPlane, EllipsisHorizontal, XMark, XMarkMini } from "@medusajs/icons"
import { useMessenger } from "../../../providers/messenger-provider/MessengerProvider"
import { useCustomerAvatar } from "../../../hooks/useCustomerAvatar"
import { client } from "../../../lib/client"
import { resolveParticipantDisplayName } from "../../../lib/messenger/resolve-participant-display-name"
import type { Message, MessageContext, ProductContextData, Participant } from "../../../lib/messenger/types"
import { ThreadListItem } from "./ThreadListItem"
import { ProductContextCard } from "./ProductContextCard"
import { VendorContextCard } from "./VendorContextCard"
import { ChatHeader } from "./ChatHeader"
import { DynamicAvatar } from "./DynamicAvatar"
import { logger } from "../../../lib/logger"
import { getCatchMessage } from "../../../lib/errors"

// ── Helpers ──────────────────────────────────────────────────────────────

function formatTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ── Participant resolution ────────────────────────────────────────────────

function getOtherParticipant(participants: Participant[]): Participant | null {
  return participants.find((p) => p.userType !== "SELLER") ?? null
}

interface MessengerVendorInboxProps {
  sellerId: string
  sellerName?: string
  sellerLogo?: string | null
}

export function MessengerVendorInbox({ sellerId: _sellerId, sellerLogo }: MessengerVendorInboxProps): React.JSX.Element {
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
  } = useMessenger()

  const { t, i18n } = useTranslation()

  const [text, setText] = useState("")
  const [search, setSearch] = useState("")
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [mobileView, setMobileView] = useState<"list" | "chat">("list")
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const [pendingDelete, setPendingDelete] = useState<{
    messageId: string
    deleteForAll: boolean
  } | null>(null)
  const [pendingDeleteConv, setPendingDeleteConv] = useState<{
    convId: string
    deleteForAll: boolean
  } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  const activeConv = conversations.find((c) => c.id === activeConversationId)
  const otherParticipant = activeConv ? getOtherParticipant(activeConv.participants ?? []) : null
  const isOtherAdmin = otherParticipant?.userType === "ADMIN"
  const isOtherCustomer =
    otherParticipant?.userType === "CUSTOMER" || otherParticipant?.userId?.startsWith("cus_")

  const { avatarUrl: customerAvatarUrl } = useCustomerAvatar(
    isOtherCustomer ? otherParticipant?.userId : undefined
  )

  const [activeContext, setActiveContext] = useState<MessageContext | null>(null)
  const [isContextLoading, setIsContextLoading] = useState(false)

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

    setIsContextLoading(true)

    if (isProduct && conv.productId) {
      const pid = conv.productId
      client.vendor.products.$id
        .query({ $id: pid })
        .then(({ product }: {
          product: ProductContextData & { thumbnail: string | null; handle: string | null }
        }) => {
          setActiveContext({
            type: "PRODUCT",
            data: {
              id: pid,
              title: product.title,
              thumbnail: product.thumbnail ?? null,
              handle: product.handle ?? null,
            },
          })
        })
        .catch(() => setActiveContext(null))
        .finally(() => setIsContextLoading(false))
    } else {
      setActiveContext({ type: "VENDOR", data: { id: "", name: "", handle: "", photo: null } })
      setIsContextLoading(false)
    }
  }, [activeConv?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const otherName = isOtherAdmin
    ? t("messenger.supportTeam")
    : isOtherCustomer
    ? resolveParticipantDisplayName(otherParticipant?.displayName, t("messages.customer"))
    : resolveParticipantDisplayName(otherParticipant?.displayName, t("messenger.unknown"))

  const isOtherTyping = typingUserIds.length > 0

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: "end" })
    })
    return () => cancelAnimationFrame(frameId)
  }, [messages, typingUserIds])

  const handleSend = useCallback(async () => {
    if (!activeConversationId) return

    if (pendingImage) {
      setIsSending(true)
      setSendError(null)
      const file = pendingImage
      setPendingImage(null)
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview)
        setPendingImagePreview(null)
      }
      try {
        await uploadImage(file)
      } catch (err) {
        logger.error(`[MessengerVendorInbox] image upload error: ${getCatchMessage(err instanceof Error ? err : undefined)}`)
        setSendError(t("messages.imageUploadFailed"))
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
      logger.error(`[MessengerVendorInbox] send error: ${getCatchMessage(err instanceof Error ? err : undefined)}`)
    } finally {
      setIsSending(false)
    }
  }, [
    text,
    pendingImage,
    pendingImagePreview,
    isSending,
    activeConversationId,
    sendMessage,
    stopTyping,
    uploadImage,
    t,
  ])

  const handleDeleteMessage = useCallback(
    async (messageId: string, deleteForAll: boolean) => {
      try {
        await deleteMessage(messageId, deleteForAll)
      } catch (err) {
        logger.error(`[MessengerVendorInbox] delete error: ${getCatchMessage(err instanceof Error ? err : undefined)}`)
      }
      setPendingDelete(null)
    },
    [deleteMessage]
  )

  const handleRequestDelete = useCallback((messageId: string, deleteForAll: boolean): void => {
    setPendingDelete({ messageId, deleteForAll })
  }, [])

  const handleRequestDeleteConv = useCallback((convId: string, deleteForAll: boolean): void => {
    setPendingDeleteConv({ convId, deleteForAll })
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeConversationId) return
    setPendingImage(file)
    setPendingImagePreview(URL.createObjectURL(file))
    e.target.value = ""
  }

  const directConversations = conversations.filter(
    (c) => (c.messages?.length ?? 0) > 0 || c.id === activeConversationId
  )

  const handleOpenConversation = useCallback(
    (id: string) => {
      openConversation(id)
      if (isMobile) setMobileView("chat")
    },
    [openConversation, isMobile]
  )

  const filtered =
    search.length < 2
      ? directConversations
      : directConversations.filter((c) => {
          const q = search.toLowerCase()
          return (
            c.subject?.toLowerCase().includes(q) ||
            c.participants?.some(
              (p: Participant) =>
                p.displayName?.toLowerCase().includes(q) ||
                p.userId?.toLowerCase().includes(q)
            )
          )
        })

  return (
    <div className="relative h-full w-full">
      <div className="flex w-full h-full border border-ui-border-base rounded-lg overflow-hidden">
        {/* ── Left: Conversation list ─────────────────────────────────────── */}
        <div
          className={`${isMobile && mobileView === "chat" ? "hidden" : "flex"} ${isMobile ? "w-full" : "w-96 flex-shrink-0"} flex-col border-r border-ui-border-base bg-ui-bg-subtle`}
        >
          <div className="p-3 border-b border-ui-border-base">
            <div className="flex items-center justify-between mb-2">
              <Heading level="h3" className="text-sm font-semibold text-ui-fg-base">
                {t("messages.domain")}
              </Heading>
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-ui-tag-green-icon" : "bg-ui-fg-muted"}`}
                title={isConnected ? t("messenger.connected") : t("messenger.disconnected")}
              />
            </div>
            <label htmlFor="vendor-messages-search" className="sr-only">
              {t("messenger.searchConversations")}
            </label>
            <input
              id="vendor-messages-search"
              name="vendorMessagesSearch"
              type="search"
              placeholder={t("messenger.searchConversations")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("messenger.searchConversations")}
              className="w-full px-2 py-1 text-sm rounded border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-ui-border-interactive"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
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
                  onDelete={handleRequestDeleteConv}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right: Chat panel ──────────────────────────────────────────────── */}
        {activeConv ? (
          <div className={`${isMobile && mobileView === "list" ? "hidden" : "flex"} flex-1 flex-col min-w-0 min-h-0 overflow-hidden`}>
            <ChatHeader
              context={activeContext}
              otherName={otherName}
              otherParticipantType={otherParticipant?.userType ?? ""}
              participantCount={activeConv.participants?.length ?? 0}
              customerAvatarUrl={isOtherCustomer ? (customerAvatarUrl ?? null) : null}
              onBack={() => { if (isMobile) setMobileView("list") }}
              onClose={() => {
                closeConversation()
                if (isMobile) setMobileView("list")
              }}
            />

            {/* Context card skeleton */}
            {isContextLoading && (
              <div className="px-4 py-2 border-b border-ui-border-base flex items-center gap-3 h-[72px] flex-shrink-0 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-ui-bg-component flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-ui-bg-component rounded w-3/4" />
                  <div className="h-2.5 bg-ui-bg-component rounded w-1/2" />
                </div>
              </div>
            )}
            {!isContextLoading && activeContext?.type === "PRODUCT" && (
              <ProductContextCard product={activeContext.data} />
            )}
            {!isContextLoading && activeContext?.type === "VENDOR" && <VendorContextCard />}

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-ui-bg-subtle"
            >
              {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="w-6 h-6 border-2 border-ui-border-interactive border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  {isOtherAdmin ? (
                    <DynamicAvatar
                      src={null}
                      alt={t("messages.helpSupport")}
                      className="w-10 h-10 mb-3"
                      type="ADMIN"
                    />
                  ) : (
                    <DynamicAvatar
                      src={customerAvatarUrl}
                      alt={otherName}
                      className="w-10 h-10 mb-3"
                      type="CUSTOMER"
                    />
                  )}
                  <p className="text-sm font-medium text-ui-fg-base">{otherName}</p>
                  <p className="text-xs text-ui-fg-muted mt-1">{t("messenger.startConversation")}</p>
                </div>
              ) : (
                messages.map((msg: Message, idx: number) => {
                  const isMe = msg.senderType === "SELLER"
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
                    const hasUrl = /https?:\/\//.test(msg.content)
                    const renderContent = (): React.ReactNode => {
                      if (!hasUrl) return msg.content
                      const urlRegex = /https?:\/\/[^\s]+/g
                      const parts = msg.content.split(urlRegex)
                      const urls = msg.content.match(urlRegex) ?? []
                      return parts.map((part, i) => (
                        <span key={i}>
                          {part}
                          {urls[i] && (
                            <a
                              href={urls[i]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline text-ui-fg-interactive hover:opacity-80"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t("messages.viewPromotion")} →
                            </a>
                          )}
                        </span>
                      ))
                    }
                    return (
                      <div key={msg.id} className="flex justify-center my-1">
                        <span
                          className={`text-xs text-ui-fg-muted bg-ui-bg-base border border-ui-border-base ${
                            hasUrl
                              ? "rounded-xl px-4 py-2 max-w-[85%] text-center block"
                              : "rounded-full px-3 py-1"
                          }`}
                        >
                          {renderContent()}
                        </span>
                      </div>
                    )
                  }

                  const myMsgs = messages.filter((m) => m.senderType === "SELLER")
                  const isLastMine = isMe && msg.id === myMsgs[myMsgs.length - 1]?.id
                  const otherCustomerSrc = isOtherAdmin ? null : customerAvatarUrl

                  return (
                    <div key={msg.id} className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      {/* Other participant avatar — left side */}
                      {!isMe && (
                        <div className="flex-shrink-0 mb-0.5">
                          {isLastInGroup ? (
                            isOtherAdmin ? (
                              <DynamicAvatar src={null} alt={t("messages.helpSupport")} className="w-7 h-7" type="ADMIN" />
                            ) : (
                              <DynamicAvatar src={otherCustomerSrc} alt={otherName} className="w-7 h-7" type="CUSTOMER" />
                            )
                          ) : (
                            <div className="w-7" />
                          )}
                        </div>
                      )}
                      {/* Seller (me) avatar — right side */}
                      {isMe && (
                        <div className="flex-shrink-0 mb-0.5">
                          {isLastInGroup ? (
                            <DynamicAvatar src={sellerLogo || activeConv?.metadata?.store_image || null} alt={t("messages.me")} className="w-7 h-7" type="SELLER" />
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
                            <p className="text-xs font-medium mb-1 opacity-70">
                              {isOtherAdmin ? t("messages.helpSupport") : otherName}
                            </p>
                          )}
                          {msg.messageType === "IMAGE" && msg.imageUrl ? (
                            <button
                              type="button"
                              onClick={() => { if (msg.imageUrl) setLightboxSrc(msg.imageUrl) }}
                              className="block border-0 p-0 cursor-zoom-in rounded-lg overflow-hidden"
                              aria-label={t("messages.viewImage")}
                            >
                              <img
                                src={msg.imageUrl}
                                alt={t("messenger.image")}
                                width={300}
                                height={200}
                                className="max-w-full rounded-lg hover:opacity-90 transition-opacity aspect-[3/2] object-contain"
                              />
                            </button>
                          ) : (
                            <p className="whitespace-pre-wrap break-words">
                              {msg.deletedForAll ? t("messages.deletedMessage") : msg.content}
                            </p>
                          )}
                          <p
                            className={`text-xs mt-1 opacity-60 text-right ${
                              isMe ? "text-ui-fg-on-inverted" : "text-ui-fg-muted"
                            }`}
                          >
                            {formatTime(msg.createdAt, i18n.language)}
                            {isMe && isLastMine && msg.readAt && (
                              <span className="ml-1">
                                {" · "}
                                {t("messenger.seen")}
                              </span>
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
                                aria-label={t("messages.chatOptions")}
                              >
                                <EllipsisHorizontal />
                              </IconButton>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content className="w-44 bg-ui-bg-base border border-ui-border-base rounded-xl shadow-lg p-1">
                              <DropdownMenu.Item
                                onClick={() => handleRequestDelete(msg.id, false)}
                                className="w-full text-left px-3 py-1.5 hover:bg-ui-bg-base-hover text-ui-fg-base transition-colors rounded-lg cursor-pointer text-sm font-medium"
                              >
                                {t("messages.deleteOnlyForMe")}
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                disabled={msg.senderType !== "SELLER"}
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
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-ui-border-base bg-ui-bg-base flex flex-col gap-2">
              {!isConnected && (
                <div className="px-3 py-1.5 bg-ui-tag-orange-bg border border-ui-tag-orange-border rounded-xl text-xs text-ui-tag-orange-text flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ui-tag-orange-icon animate-pulse flex-shrink-0" />
                  {t("messages.connectionLost")}
                </div>
              )}
              {sendError && <p className="text-xs text-ui-tag-red-text px-1">{sendError}</p>}
              <div className="flex gap-2 items-end">
                <IconButton
                  type="button"
                  size="small"
                  variant="transparent"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0"
                  aria-label={t("messages.attachImage")}
                  aria-controls="vendor-messages-image-upload"
                >
                  <PaperClip />
                </IconButton>
                <input
                  ref={fileInputRef}
                  id="vendor-messages-image-upload"
                  name="vendorMessagesImage"
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
                <label htmlFor="vendor-messages-compose" className="sr-only">
                  {t("messenger.typeMessage")}
                </label>
                <textarea
                  ref={textareaRef}
                  id="vendor-messages-compose"
                  name="vendorMessagesCompose"
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder={t("messenger.typeMessage")}
                  aria-label={t("messenger.typeMessage")}
                  rows={1}
                  className="flex-1 px-3 py-2 text-sm rounded-2xl border border-ui-border-base bg-ui-bg-subtle text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none focus:border-ui-border-interactive resize-none leading-5 max-h-24 overflow-y-auto min-h-9"
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
            alt={t("messages.imageAlt")}
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
