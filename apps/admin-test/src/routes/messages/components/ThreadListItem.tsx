import { useTranslation } from "react-i18next"
import { DropdownMenu, IconButton } from "@medusajs/ui"
import { EllipsisHorizontal, ShoppingBag, BuildingStorefront } from "@medusajs/icons"
import type { Conversation } from "../../../lib/messenger/types"
import { useCustomerAvatar } from "../../../hooks/useCustomerAvatar"
import { resolveParticipantDisplayName } from "../../../lib/messenger/resolve-participant-display-name"
import { useAdminSellerAvatar } from "../../../hooks/api/seller-avatar"
import { DynamicAvatar } from "./DynamicAvatar"

// ── Relative time ─────────────────────────────────────────────────────────────

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
  conv,
  isProduct,
  isSeller,
  avatarUrl,
  sellerAvatarUrl,
  productAlt,
  sellerAlt,
  customerAlt,
}: {
  conv: Conversation
  isProduct: boolean
  isSeller: boolean
  avatarUrl: string | null
  sellerAvatarUrl: string | null
  productAlt: string
  sellerAlt: string
  customerAlt: string
}): React.JSX.Element {
  const meta = conv.metadata

  if (isSeller) {
    const productImage = isProduct && meta?.type === "product" ? meta.product_image : null
    if (isProduct && productImage) {
      return (
        <img
          src={productImage}
          alt={meta?.type === "product" ? meta.product_name : productAlt}
          className="w-10 h-10 rounded-xl object-cover aspect-square flex-shrink-0"
        />
      )
    }
    if (isProduct) {
      return (
        <div className="w-10 h-10 rounded-xl bg-ui-tag-orange-bg flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="w-5 h-5 text-ui-tag-orange-text" />
        </div>
      )
    }
    // vendor-based from seller
    const storeImage = sellerAvatarUrl ?? (meta?.type === "store" ? meta.store_image : null)
    return (
      <DynamicAvatar src={storeImage} alt={sellerAlt} className="w-10 h-10" type="SELLER" />
    )
  }

  // Customer conversation
  return (
    <DynamicAvatar src={avatarUrl} alt={customerAlt} className="w-10 h-10" type="CUSTOMER" />
  )
}

// ── ThreadListItem ────────────────────────────────────────────────────────────

interface ThreadListItemProps {
  conv: Conversation
  isActive: boolean
  onOpen: (id: string) => void
  onDelete: (id: string, deleteForAll: boolean) => void
}

export function ThreadListItem({ conv, isActive, onOpen, onDelete }: ThreadListItemProps): React.JSX.Element {
  const { t, i18n } = useTranslation()

  const isProduct =
    conv.contextType === "PRODUCT_BASED" ||
    (conv.contextType !== "VENDOR_BASED" && !!conv.productId)

  const other = conv.participants?.find((p) => p.userType !== "ADMIN") ?? null
  const isFromSeller = other?.userType === "SELLER"
  const isFromCustomer =
    !isFromSeller && (other?.userType === "CUSTOMER" || !!other?.userId?.startsWith("cus_"))

  const { avatarUrl: resolvedAvatarUrl } = useCustomerAvatar(
    isFromCustomer ? other?.userId : undefined
  )

  const { data: sellerAvatarData } = useAdminSellerAvatar(
    isFromSeller ? other?.userId : undefined
  )
  const sellerAvatarUrl = sellerAvatarData?.avatar_url ?? null

  const meta = conv.metadata
  const productName = meta?.type === "product" ? meta.product_name : null
  const storeName = meta?.type === "store" ? meta.store_name : null

  const displayName = isFromCustomer
    ? resolveParticipantDisplayName(other?.displayName, t("messages.customerMessage"))
    : resolveParticipantDisplayName(other?.displayName, t("messenger.unknown"))

  const convLabel = isProduct
    ? productName ?? displayName
    : storeName ?? displayName

  const lastMsg = conv.messages?.[0]
  const unread = conv.participants?.find((p) => p.userType === "ADMIN")?.unreadCount ?? 0

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
            {/* Thumbnail */}
            <div className="relative w-10 h-10 flex-shrink-0">
              <ContextThumbnail
                conv={conv}
                isProduct={isProduct}
                isSeller={isFromSeller}
                avatarUrl={isFromCustomer ? resolvedAvatarUrl : null}
                sellerAvatarUrl={sellerAvatarUrl}
                productAlt={t("messages.product")}
                sellerAlt={t("messenger.seller")}
                customerAlt={t("messenger.customer")}
              />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-ui-tag-green-bg text-ui-tag-green-text text-[10px] rounded-full flex items-center justify-center px-1 font-medium">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </div>

            {/* Content — preview + badge stacked */}
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center justify-between gap-1 min-w-0 overflow-hidden">
                <span className="text-sm font-medium text-ui-fg-base truncate flex-1 min-w-0">{convLabel}</span>
                <span className="text-xs text-ui-fg-muted flex-shrink-0">
                  {formatRelativeTime(conv.updatedAt, i18n.language)}
                </span>
              </div>
              <p className="text-xs text-ui-fg-muted truncate mt-0.5">
                {lastMsg
                  ? lastMsg.messageType === "IMAGE"
                    ? `📷 ${t("messenger.image")}`
                    : lastMsg.content?.slice(0, 50)
                  : conv.type === "ADMIN_SUPPORT"
                    ? t("messenger.support")
                    : t("messenger.direct")}
              </p>
              {isProduct ? (
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-ui-tag-orange-bg text-ui-tag-orange-text font-medium max-w-full">
                  <ShoppingBag className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{t("messages.product")}</span>
                </span>
              ) : (
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-ui-tag-green-bg text-ui-tag-green-text font-medium max-w-full">
                  <BuildingStorefront className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{t("messages.store")}</span>
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
                aria-label={t("messenger.conversationOptions")}
              >
                <EllipsisHorizontal />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content className="w-52 bg-ui-bg-base border border-ui-border-base rounded-xl shadow-lg p-1">
              <DropdownMenu.Item
                onClick={() => onDelete(conv.id, false)}
                className="w-full text-left px-4 py-2.5 hover:bg-ui-bg-base-hover text-ui-fg-base transition-colors rounded-lg cursor-pointer text-sm font-medium"
              >
                {t("messages.delete")}
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
