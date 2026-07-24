import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Prompt, DropdownMenu, IconButton } from "@medusajs/ui"
import { PaperClip, PaperPlane, EllipsisHorizontal, XMarkMini } from "@medusajs/icons"
import { ImageLightbox } from "@mercurjs/dashboard-shared"
import { useMessenger } from "../../../providers/messenger-provider/MessengerProvider"
import { client } from "../../../lib/client"
import type { Message } from "../../../lib/messenger/types"
import { logger } from "../../../lib/logger"
import { getCatchMessage } from "../../../lib/errors"

function formatTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function TypingDots(): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="w-2 h-2 rounded-full bg-ui-fg-muted animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 rounded-full bg-ui-fg-muted animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 rounded-full bg-ui-fg-muted animate-bounce [animation-delay:300ms]" />
    </div>
  )
}

interface MessengerChatProps {
  currentUserId: string
  otherName?: string
}

export function MessengerChat({ currentUserId, otherName }: MessengerChatProps): React.JSX.Element {
  const { i18n, t } = useTranslation()
  const displayOtherName = otherName ?? t("messages.supportName")

  const {
    conversations,
    pinnedMessages,
    typingUserIds,
    isLoadingMessages,
    sendSidebarMessage,
    uploadSidebarImage,
    deleteSidebarMessage,
    startTyping,
    stopTyping,
    openSidebarConversation,
    startConversation,
  } = useMessenger()

  const [text, setText] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect((): (() => void) => {
    return (): void => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])
  const [isInitializing, setIsInitializing] = useState(true)
  const [adminUserId, setAdminUserId] = useState<string | null>(null)
  const [localConvId, setLocalConvId] = useState<string | null>(null)

  const [pendingDelete, setPendingDelete] = useState<{
    messageId: string
    deleteForAll: boolean
  } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current || !currentUserId) return
    initializedRef.current = true

    client.vendor.support.adminContact
      .query()
      .then(async (data) => {
        const aid = "adminUserId" in data ? data.adminUserId : null
        if (!aid) throw new Error("No admin user found")
        setAdminUserId(aid)
        const existing = conversations.find((c) => c.type === "ADMIN_SUPPORT")
        if (existing) {
          setLocalConvId(existing.id)
          await openSidebarConversation(existing.id)
        }
      })
      .catch((err) => {
        logger.error(getCatchMessage(err instanceof Error ? err : undefined))
        initializedRef.current = false
      })
      .finally(() => setIsInitializing(false))
  }, [currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [pinnedMessages, typingUserIds])

  const handleRemoveImage = (): void => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedImage(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSend = useCallback(async (): Promise<void> => {
    const content = text.trim()
    if ((!content && !selectedImage) || isSending) return
    setIsSending(true)
    setText("")
    stopTyping()

    const imageToUpload = selectedImage
    const currentPreviewUrl = previewUrl

    try {
      let cid = localConvId
      if (!cid) {
        if (!adminUserId) return
        cid = await startConversation({
          targetUserId: adminUserId,
          targetUserType: "ADMIN",
          type: "ADMIN_SUPPORT",
          subject: t("messages.supportSubject"),
        })
        if (!cid) return
        setLocalConvId(cid)
        await openSidebarConversation(cid)
      }

      if (imageToUpload) {
        await uploadSidebarImage(imageToUpload, async (): Promise<string> => {
          if (cid) return cid
          throw new Error("Conversation ID not available")
        })
        if (currentPreviewUrl) {
          URL.revokeObjectURL(currentPreviewUrl)
        }
        setSelectedImage(null)
        setPreviewUrl(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }

      if (content) {
        await sendSidebarMessage(content)
      }
    } catch (err) {
      logger.error(`[MessengerChat] handleSend error: ${getCatchMessage(err instanceof Error ? err : undefined)}`)
    } finally {
      setIsSending(false)
    }
  }, [
    text,
    selectedImage,
    previewUrl,
    isSending,
    localConvId,
    adminUserId,
    sendSidebarMessage,
    uploadSidebarImage,
    startConversation,
    openSidebarConversation,
    stopTyping,
    t,
  ])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setText(e.target.value)
    startTyping()
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => stopTyping(), 3000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedImage(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const isOtherTyping = typingUserIds.length > 0
  const myMessages = pinnedMessages.filter((m) => m.senderType === "SELLER")
  const lastMyMessageId = myMessages[myMessages.length - 1]?.id

  const handleDeleteMessage = useCallback(
    async (messageId: string, deleteForAll: boolean) => {
      try {
        await deleteSidebarMessage(messageId, deleteForAll)
      } catch (err) {
        logger.error(`[MessengerChat] delete error: ${getCatchMessage(err instanceof Error ? err : undefined)}`)
      }
      setPendingDelete(null)
    },
    [deleteSidebarMessage]
  )

  const handleRequestDelete = useCallback((messageId: string, deleteForAll: boolean): void => {
    setPendingDelete({ messageId, deleteForAll })
  }, [])

  if (isInitializing && pinnedMessages.length === 0) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <div className="w-6 h-6 border-2 border-ui-border-interactive border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <div className="flex flex-col h-full">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scroll-smooth">
          {isLoadingMessages ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-6 h-6 border-2 border-ui-border-interactive border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pinnedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-6">
              <p className="text-sm text-ui-fg-muted">{t("messages.emptyState")}</p>
            </div>
          ) : (
            pinnedMessages.map((msg: Message) => {
              const isMine = msg.senderType === "SELLER"
              const isNotification = msg.messageType === "NOTIFICATION"
              const isLastMine = msg.id === lastMyMessageId

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
                          {t("messages.viewPromotion")}
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

              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[70%] flex flex-col items-end gap-1">
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm max-w-full ${
                        isMine
                          ? "bg-ui-button-inverted text-ui-fg-on-inverted"
                          : "bg-ui-bg-base text-ui-fg-base border border-ui-border-base"
                      }${msg.deletedForAll ? " italic opacity-70" : ""}`}
                    >
                      {!isMine && (
                        <p className="text-xs font-medium mb-1 opacity-70">{displayOtherName}</p>
                      )}
                      {msg.messageType === "IMAGE" && msg.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => { if (msg.imageUrl) setLightboxSrc(msg.imageUrl) }}
                          className="block border-0 p-0 cursor-zoom-in rounded-lg overflow-hidden"
                          aria-label={t("messages.viewImage")}
                        >
                          <img src={msg.imageUrl} alt={t("messages.imageAlt")} className="max-w-full rounded-lg hover:opacity-90 transition-opacity" />
                        </button>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">
                          {msg.deletedForAll ? t("messages.deletedMessage") : msg.content}
                        </p>
                      )}
                      <p
                        className={`text-xs mt-1 opacity-60 text-right ${
                          isMine ? "text-ui-fg-on-inverted" : "text-ui-fg-muted"
                        }`}
                      >
                        {formatTime(msg.createdAt, i18n.language)}
                        {isMine && isLastMine && msg.readAt && (
                          <span className="ml-1">· {t("messenger.seen")}</span>
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
                            disabled={pinnedMessages.find((m) => m.id === msg.id)?.senderType !== "SELLER"}
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
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-2.5 border-t border-ui-border-base bg-ui-bg-base">
          {previewUrl && (
            <div className="relative w-20 h-20 mb-2 border border-ui-border-base rounded-lg overflow-hidden group">
              <img
                src={previewUrl}
                alt="Preview"
                className={`w-full h-full object-cover ${isSending ? "opacity-50" : ""}`}
              />
              {!isSending && (
                <IconButton
                  type="button"
                  size="2xsmall"
                  className="absolute top-1 right-1 rounded-full bg-ui-button-inverted text-ui-fg-on-inverted hover:bg-ui-tag-red-bg hover:text-ui-tag-red-text transition-colors"
                  onClick={handleRemoveImage}
                  aria-label="Remove image"
                >
                  <XMarkMini />
                </IconButton>
              )}
            </div>
          )}
          <div className="flex items-end gap-2 bg-ui-bg-subtle rounded-[20px] px-3 py-2 border border-ui-border-base focus-within:border-ui-border-interactive transition-colors">
            <IconButton
              type="button"
              size="small"
              variant="transparent"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 mb-0.5"
            >
              <PaperClip />
            </IconButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <textarea
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={t("messages.placeholder")}
              rows={1}
              className="flex-1 bg-transparent text-sm text-ui-fg-base placeholder:text-ui-fg-muted resize-none outline-none leading-5 max-h-20 overflow-y-auto min-h-[20px]"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={(!text.trim() && !selectedImage) || isSending}
              className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 mb-0.5 transition-all disabled:text-ui-fg-disabled enabled:text-ui-fg-interactive enabled:hover:bg-ui-bg-base-hover"
            >
              <PaperPlane className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

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

      <ImageLightbox
        images={lightboxSrc ? [{ id: "current", url: lightboxSrc, alt: t("messages.imageAlt") }] : []}
        index={lightboxSrc ? 0 : null}
        onIndexChange={(nextIndex) => {
          if (nextIndex === null) setLightboxSrc(null)
        }}
      />
    </div>
  )
}
