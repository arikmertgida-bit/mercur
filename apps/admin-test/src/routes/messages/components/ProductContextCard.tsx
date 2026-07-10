import { useTranslation } from "react-i18next"
import { ShoppingBag } from "@medusajs/icons"
import type { ProductContextData } from "../../../lib/messenger/types"

declare const __STOREFRONT_URL__: string
const STOREFRONT_URL =
  (typeof __STOREFRONT_URL__ !== "undefined" ? __STOREFRONT_URL__ : null) ??
  "http://localhost:3000"

interface ProductContextCardProps {
  product: ProductContextData
}

/**
 * Admin Panel — context card shown at the top of the chat panel when the
 * conversation is PRODUCT_BASED.
 */
export function ProductContextCard({ product }: ProductContextCardProps) {
  const { t } = useTranslation()
  const productUrl = product.handle
    ? `${STOREFRONT_URL}/tr/products/${product.handle}`
    : null

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-ui-bg-base border-b border-ui-border-base flex-shrink-0">
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-ui-bg-subtle flex-shrink-0 border border-ui-border-base">
        {product.thumbnail ? (
          <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ui-fg-muted">
            <ShoppingBag className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-ui-fg-muted font-medium uppercase tracking-wide mb-0.5">
          {t("messages.productQuestion")}
        </p>
        {productUrl ? (
          <a
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-ui-fg-base hover:text-ui-fg-interactive hover:underline truncate block transition-colors"
          >
            {product.title}
            <span className="ml-1 text-ui-fg-muted text-xs">↗</span>
          </a>
        ) : (
          <p className="text-sm font-medium text-ui-fg-base truncate">{product.title}</p>
        )}
      </div>

      <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-ui-tag-orange-bg text-ui-tag-orange-text font-medium">
        {t("messages.product")}
      </span>
    </div>
  )
}
