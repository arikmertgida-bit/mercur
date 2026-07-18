import { PencilSquare } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { ActionMenu } from "@components/common/action-menu"
import { TextSkeleton } from "@components/common/skeleton"
import { useMultipleInventoryItemLevels } from "@hooks/api/inventory"
import { LOW_STOCK_THRESHOLD } from "@pages/products/common/constants"

export type StockSummarySectionProps = {
  inventoryItemIds: string[]
  editTo: string
}

/**
 * Read-only live-stock summary reused on both the product detail page
 * (aggregated across every variant) and the variant detail page (scoped to
 * one variant). Editing always goes through the same inventory-level
 * records Envanter itself reads/writes — this is a shortcut into that data,
 * not a second stock system.
 */
export const StockSummarySection = ({
  inventoryItemIds,
  editTo,
}: StockSummarySectionProps) => {
  const { t } = useTranslation()

  const hasInventoryItems = inventoryItemIds.length > 0

  const { allLocationLevels, isPending } = useMultipleInventoryItemLevels(
    hasInventoryItems ? inventoryItemIds : []
  )

  const totalAvailable = allLocationLevels.reduce(
    (sum, level) => sum + level.available_quantity,
    0
  )
  const isLowStock = hasInventoryItems && totalAvailable < LOW_STOCK_THRESHOLD

  return (
    <Container className="divide-y p-0" data-testid="product-stock-section">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("products.stock.header")}</Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  label: t("actions.edit"),
                  to: editTo,
                  icon: <PencilSquare />,
                },
              ],
            },
          ]}
        />
      </div>
      <div className="flex items-center justify-between px-6 py-4">
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {t("products.stock.available")}
        </Text>
        {!hasInventoryItems ? (
          <Text size="small" leading="compact" className="text-ui-fg-muted">
            -
          </Text>
        ) : isPending ? (
          <TextSkeleton size="small" characters={6} />
        ) : (
          <div className="flex items-center gap-x-2">
            {isLowStock && (
              <span
                aria-hidden
                className="bg-ui-tag-red-icon size-2 animate-pulse rounded-full"
                title={t("products.stock.lowStock")}
              />
            )}
            <Text
              size="small"
              weight="plus"
              leading="compact"
              data-testid="product-stock-available-quantity"
            >
              {totalAvailable}
            </Text>
          </div>
        )}
      </div>
    </Container>
  )
}
