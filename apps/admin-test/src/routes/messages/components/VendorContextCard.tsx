import { useTranslation } from "react-i18next"
import { BuildingStorefront } from "@medusajs/icons"

/**
 * Admin Panel — context card shown at the top of the chat panel when the
 * conversation is VENDOR_BASED (general store question).
 */
export function VendorContextCard() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-ui-bg-subtle border-b border-ui-border-base flex-shrink-0">
      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-ui-tag-green-bg flex items-center justify-center flex-shrink-0">
        <BuildingStorefront className="w-4 h-4 text-ui-tag-green-text" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-ui-fg-base">{t("messages.storeQuestion")}</p>
        <p className="text-[10px] text-ui-fg-muted mt-0.5">{t("messages.storeContext")}</p>
      </div>

      <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-ui-tag-green-bg text-ui-tag-green-text font-medium">
        {t("messages.store")}
      </span>
    </div>
  )
}
