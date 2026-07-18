import { StockSummarySection } from "@pages/products/common/components/stock-summary-section/stock-summary-section"
import { useProductInventoryItemIds } from "@pages/products/common/hooks/use-product-inventory-item-ids"

export const ProductStockSection = ({
  product,
}: {
  product: { id: string }
}) => {
  const { inventoryItemIds } = useProductInventoryItemIds(product.id)

  return (
    <StockSummarySection inventoryItemIds={inventoryItemIds} editTo="stock" />
  )
}
