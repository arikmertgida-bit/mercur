import { useTranslation } from "react-i18next"
import { ChevronLeft, ShoppingBag, XMark } from "@medusajs/icons"
import { IconButton } from "@medusajs/ui"
import type { MessageContext } from "../../../lib/messenger/types"
import { DynamicAvatar } from "./DynamicAvatar"

interface ChatHeaderProps {
  context: MessageContext | null
  otherName: string
  otherParticipantType: string
  participantCount: number
  customerAvatarUrl: string | null
  onBack: () => void
  onClose: () => void
}

export function ChatHeader({
  context,
  otherName,
  otherParticipantType,
  participantCount,
  customerAvatarUrl,
  onBack,
  onClose,
}: ChatHeaderProps) {
  const { t } = useTranslation()
  const isProduct = context?.type === "PRODUCT"
  const isVendor = context?.type === "VENDOR"
  const productData = context?.type === "PRODUCT" ? context.data : null

  const contextLabel = isProduct
    ? t("messages.productQuestion")
    : isVendor
    ? t("messages.storeQuestion")
    : otherParticipantType

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

      {otherParticipantType === "ADMIN" ? (
        <DynamicAvatar src={null} alt="Kayi.com" className="w-8 h-8" type="ADMIN" />
      ) : (
        <DynamicAvatar src={customerAvatarUrl} alt={otherName} className="w-10 h-10" type="CUSTOMER" />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ui-fg-base truncate">{otherName}</p>
        <p className="text-xs text-ui-fg-muted">
          {otherParticipantType === "ADMIN" ? (
            t("messages.management")
          ) : (
            <>
              {contextLabel}
              {" · "}
              {participantCount} {t("messages.participant")}
            </>
          )}
        </p>
      </div>

      {/* Product context — header right area */}
      {productData && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-ui-tag-orange-bg border border-ui-border-base rounded-lg flex-shrink-0 max-w-[130px]">
          <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0 bg-ui-bg-subtle flex items-center justify-center">
            {productData.thumbnail ? (
              <img src={productData.thumbnail} alt={productData.title} className="w-full h-full object-cover" />
            ) : (
              <ShoppingBag className="w-3 h-3 text-ui-tag-orange-text" />
            )}
          </div>
          <p className="text-[10px] font-medium text-ui-tag-orange-text truncate leading-tight">{productData.title}</p>
        </div>
      )}

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
