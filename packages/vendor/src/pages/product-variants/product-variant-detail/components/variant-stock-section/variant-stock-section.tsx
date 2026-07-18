import { HttpTypes } from "@medusajs/types"

import { StockSummarySection } from "@pages/products/common/components/stock-summary-section/stock-summary-section"

export const VariantStockSection = ({
  variant,
}: {
  variant: HttpTypes.AdminProductVariant
}) => {
  const inventoryItemIds = (variant.inventory_items ?? [])
    .map((link) => link.inventory_item_id)
    .filter((id): id is string => !!id)

  return (
    <StockSummarySection inventoryItemIds={inventoryItemIds} editTo="stock" />
  )
}
