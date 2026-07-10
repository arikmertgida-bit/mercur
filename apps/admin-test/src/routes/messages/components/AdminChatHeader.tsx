import { useTranslation } from "react-i18next"
import { ChevronLeft, XMark } from "@medusajs/icons"
import { IconButton } from "@medusajs/ui"
import type { MessageContext, UserType } from "../../../lib/messenger/types"
import { DynamicAvatar } from "./DynamicAvatar"

interface AdminChatHeaderProps {
  context: MessageContext | null
  otherName: string
  otherParticipantType: UserType | ""
  customerAvatarUrl: string | null
  sellerAvatarUrl?: string | null
  onBack: () => void
  onClose: () => void
}

export function AdminChatHeader({
  context,
  otherName,
  otherParticipantType,
  customerAvatarUrl,
  sellerAvatarUrl,
  onBack,
  onClose,
}: AdminChatHeaderProps) {
  const { t } = useTranslation()

  const isProduct = context?.type === "PRODUCT"
  const isVendor = context?.type === "VENDOR"

  const contextLabel = isProduct
    ? t("messages.productQuestion")
    : isVendor
    ? t("messages.storeQuestion")
    : otherParticipantType === "CUSTOMER"
    ? t("messages.customerMessage")
    : otherParticipantType === "SELLER"
    ? t("messages.sellerMessage")
    : t("messages.directMessage")

  return (
    <div className="p-3 border-b border-ui-border-base bg-ui-bg-base flex items-center gap-2 flex-shrink-0">
      {/* Mobile back */}
      <IconButton
        type="button"
        size="small"
        variant="transparent"
        onClick={onBack}
        className="md:hidden flex-shrink-0"
        aria-label={t("messages.back")}
      >
        <ChevronLeft />
      </IconButton>

      {otherParticipantType === "CUSTOMER" ? (
        <DynamicAvatar src={customerAvatarUrl} alt={otherName} className="w-8 h-8" type="CUSTOMER" />
      ) : otherParticipantType === "SELLER" ? (
        <DynamicAvatar src={sellerAvatarUrl} alt={otherName} className="w-8 h-8" type="SELLER" />
      ) : (
        <DynamicAvatar src={null} alt="Kayı.com" className="w-8 h-8" type="ADMIN" />
      )}

      {/* Name + context */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ui-fg-base truncate">{otherName}</p>
        <p className="text-xs text-ui-fg-muted truncate">{contextLabel}</p>
      </div>

      {/* Close */}
      <IconButton
        type="button"
        size="small"
        variant="transparent"
        onClick={onClose}
        className="flex-shrink-0"
        aria-label={t("messages.close")}
      >
        <XMark />
      </IconButton>
    </div>
  )
}
