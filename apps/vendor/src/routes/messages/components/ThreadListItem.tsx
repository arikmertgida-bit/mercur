import { useTranslation } from "react-i18next"
import { DropdownMenu, IconButton } from "@medusajs/ui"
import { EllipsisHorizontal, ShoppingBag, BuildingStorefront } from "@medusajs/icons"
import { useCustomerAvatar } from "../../../hooks/useCustomerAvatar"
import { resolveParticipantDisplayName } from "../../../lib/messenger/resolve-participant-display-name"
import type { Conversation } from "../../../lib/messenger/types"
import { DynamicAvatar } from "./DynamicAvatar"
import { MEDUSA_STOREFRONT_URL } from "../../../lib/storefront"

// ── Relative time without date-fns ────────────────────────────────────────────

function formatRelativeTime(dateStr: string, locale: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const secs = Math.round(diffMs / 1000)
  const mins = Math.round(secs / 60)
  const hours = Math.round(mins / 60)
  const days = Math.round(hours / 24)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  if (secs < 60) return rtf.format(-secs, "second")
  if (mins < 60) return rtf.format(-mins, "minute")
  if (hours < 24) return rtf.format(-hours, "hour")
  if (days < 7) return rtf.format(-days, "day")
  if (days < 30) return rtf.format(-Math.round(days / 7), "week")
  return rtf.format(-Math.round(days / 30), "month")
}

// ── ContextThumbnail ──────────────────────────────────────────────────────────

function ContextThumbnail({
  customerAvatarUrl,
  customerName,
  isProduct,
  isAdmin,
}: {
  customerAvatarUrl: string | null
  customerName: string
  isProduct: boolean
  isAdmin: boolean
}): React.JSX.Element {
  const { t } = useTranslation()

  if (isAdmin) {
    return (
      <DynamicAvatar src={null} alt={t("messages.helpSupport")} className="w-10 h-10" type="ADMIN" />
    )
  }

  if (isProduct) {
    return <DynamicAvatar src={customerAvatarUrl} alt={customerName} className="w-10 h-10" type="CUSTOMER" />
  }

  return <DynamicAvatar src={customerAvatarUrl} alt={customerName} className="w-10 h-10" type="CUSTOMER" />
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ThreadListItemProps {
  conv: Conversation
  isActive: boolean
  onOpen: (id: string) => void
  onDelete: (id: string, deleteForAll: boolean) => void
}

export function ThreadListItem({ conv, isActive, onOpen, onDelete }: ThreadListItemProps): React.JSX.Element {
  const isProduct =
    conv.contextType === "PRODUCT_BASED" ||
    (conv.contextType !== "VENDOR_BASED" && !!conv.productId)
  const other = conv.participants?.find((p) => p.userType !== "SELLER") ?? null
  const isAdmin = other?.userType === "ADMIN"
  const isOtherCustomer =
    !isAdmin && (other?.userType === "CUSTOMER" || !!other?.userId?.startsWith("cus_"))
  const { t, i18n } = useTranslation()

  const { avatarUrl: resolvedAvatarUrl } = useCustomerAvatar(
    isOtherCustomer ? other?.userId : undefined
  )

  const customerFallback = t("messages.customer")
  const resolvedDisplayName = isOtherCustomer
    ? resolveParticipantDisplayName(other?.displayName, customerFallback)
    : null

  const meta = conv.metadata
  const productName = meta?.type === "product" ? meta.product_name : null

  const name = isProduct
    ? productName ?? resolvedDisplayName ?? t("messages.productQuestion")
    : resolvedDisplayName ?? customerFallback

  const lastMsg = conv.messages?.[0]
  const unread = conv.participants?.find((p) => p.userType === "SELLER")?.unreadCount ?? 0

  return (
    <>
      <div className="relative group">
        <div
          onClick={() => onOpen(conv.id)}
          className={`w-full text-left p-3 border-b border-ui-border-base transition-colors hover:bg-ui-bg-base-hover cursor-pointer ${
            isActive ? "bg-ui-bg-base border-l-2 border-l-ui-border-interactive" : ""
          }`}
        >
          <div className="flex items-start gap-2">
            {/* Left visual */}
            <div className="relative w-10 h-10 flex-shrink-0">
              <ContextThumbnail
                customerAvatarUrl={resolvedAvatarUrl}
                customerName={name}
                isProduct={isProduct}
                isAdmin={isAdmin}
              />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-ui-tag-blue-bg text-ui-tag-blue-text text-[10px] rounded-full flex items-center justify-center px-1 font-medium">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-start justify-between gap-1 min-w-0 overflow-hidden">
                {isAdmin ? (
                  <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                    <DynamicAvatar
                      src={`${MEDUSA_STOREFRONT_URL.replace(/\/$/, "")}/Logo.png`}
                      alt="Kayi.com Logo"
                      className="h-4"
                      isRectangular={true}
                      type="ADMIN"
                    />
                    <span className="text-sm font-medium text-ui-fg-base truncate flex-1 min-w-0">
                      {t("messenger.supportTeam")}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-medium text-ui-fg-base truncate flex-1 min-w-0">{name}</span>
                )}
                <span className="text-xs text-ui-fg-muted flex-shrink-0 mt-0.5">
                  {formatRelativeTime(conv.updatedAt, i18n.language)}
                </span>
              </div>

              <p className="text-xs text-ui-fg-muted truncate mt-0.5">
                {lastMsg
                  ? lastMsg.messageType === "IMAGE"
                    ? `📷 ${t("messenger.imageMessage")}`
                    : lastMsg.content?.slice(0, 50)
                  : conv.subject ?? t("messages.noMessages")}
              </p>

              {/* Context badge */}
              {isAdmin ? null : isProduct ? (
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-ui-tag-orange-bg text-ui-tag-orange-text font-medium">
                  <ShoppingBag className="w-2.5 h-2.5 flex-shrink-0" />
                  {t("messages.productQuestion")}
                </span>
              ) : (
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-ui-tag-green-bg text-ui-tag-green-text font-medium">
                  <BuildingStorefront className="w-2.5 h-2.5 flex-shrink-0" />
                  {t("messages.storeQuestion")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3-dot menu */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <IconButton
                type="button"
                size="small"
                variant="transparent"
                aria-label={t("messages.chatOptions")}
              >
                <EllipsisHorizontal />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content className="w-52 bg-ui-bg-base border border-ui-border-base rounded-xl shadow-lg p-1">
              <DropdownMenu.Item
                onClick={() => onDelete(conv.id, false)}
                className="w-full text-left px-4 py-2.5 hover:bg-ui-bg-base-hover text-ui-fg-base transition-colors rounded-lg cursor-pointer text-sm font-medium"
              >
                {t("messages.deleteOnlyForMe")}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => onDelete(conv.id, true)}
                className="w-full text-left px-4 py-2.5 hover:bg-ui-tag-red-bg text-ui-tag-red-text transition-colors rounded-lg cursor-pointer text-sm font-medium"
              >
                {t("messages.deleteForEveryone")}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
      </div>
    </>
  )
}
