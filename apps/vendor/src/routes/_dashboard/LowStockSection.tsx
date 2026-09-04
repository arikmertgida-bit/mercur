import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Photo } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { VendorDashboardData } from "../../hooks/api/dashboard"

const LOW_STOCK_CARD_GRID_CLASSES =
  "grid grid-cols-2 gap-4 px-6 py-6 sm:grid-cols-3 lg:grid-cols-6"

// Same visual language as packages/vendor's product-detail live-stock
// warning (see StockSummarySection) — a red pulsing dot for "this needs
// attention". Reused as-is (not a fork) since every item reaching this list
// is already at/below apps/api's own low-stock threshold (see
// apps/api/src/jobs/compute-seller-analytics.ts's LOW_STOCK_THRESHOLD), so
// there is no separate "still fine" state to distinguish here.
const LowStockDot = () => (
  <span
    aria-hidden
    className="bg-ui-tag-red-icon size-2 shrink-0 animate-pulse rounded-full"
  />
)

// Same broken-image fallback behavior as packages/vendor's shared
// Thumbnail component (components/common/thumbnail) — not imported directly
// since packages/vendor doesn't expose it on its public package surface
// (apps/vendor only consumes @mercurjs/vendor's ./pages/* entry points), so
// this mirrors its onError-swap-to-icon pattern locally instead of reaching
// into that package's internals.
const LowStockThumbnail = ({ src, alt }: { src: string | null; alt: string }) => {
  const [erroredSrc, setErroredSrc] = useState<string | null>(null)
  const showImage = !!src && src !== erroredSrc

  return (
    <div className="bg-ui-bg-component border-ui-border-base flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
      {showImage ? (
        <img
          src={src}
          alt={alt}
          onError={() => setErroredSrc(src)}
          className="h-full w-full object-cover object-center"
        />
      ) : (
        <Photo className="text-ui-fg-subtle" />
      )}
    </div>
  )
}

export const LowStockSection = ({
  data,
  isLoading,
}: {
  data: VendorDashboardData | undefined
  isLoading: boolean
}) => {
  const { t } = useTranslation()
  const items = data?.low_stock ?? []

  return (
    <Container className="mt-2 divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("dashboard.lowStock.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("dashboard.lowStock.subtitle")}
          </Text>
        </div>
        <Link to="/inventory" className="text-ui-fg-interactive txt-compact-small-plus">
          {t("dashboard.lowStock.viewInventory")}
        </Link>
      </div>
      {isLoading ? (
        <div className={LOW_STOCK_CARD_GRID_CLASSES}>
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="bg-ui-bg-component h-28 w-full animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-ui-fg-muted px-6 py-8 text-center">
          {t("dashboard.lowStock.noRecords")}
        </div>
      ) : (
        <div className={LOW_STOCK_CARD_GRID_CLASSES}>
          {items.map((item) => (
            <Link key={item.inventory_item_id} to={`/inventory/${item.inventory_item_id}`}>
              <Container className="hover:bg-ui-bg-base-hover transition-fg flex h-full flex-col gap-y-3 p-4">
                <div className="flex items-start gap-x-3">
                  <LowStockThumbnail src={item.thumbnail} alt={item.product_title} />
                  <div className="flex min-w-0 flex-col gap-y-1">
                    <Text
                      size="small"
                      weight="plus"
                      leading="compact"
                      className="line-clamp-2"
                      title={item.product_title}
                    >
                      {item.product_title}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-subtle truncate">
                      {item.sku ?? "—"}
                    </Text>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-x-2">
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {t("dashboard.lowStock.available")}
                  </Text>
                  <div className="flex items-center gap-x-1.5">
                    <LowStockDot />
                    <Text size="small" weight="plus" leading="compact">
                      {item.available_quantity}
                    </Text>
                  </div>
                </div>
              </Container>
            </Link>
          ))}
        </div>
      )}
    </Container>
  )
}
