import { useProductVariants } from "@hooks/api/products"
import {
  PRODUCT_STOCK_VARIANT_FIELDS,
  PRODUCT_STOCK_VARIANT_LIMIT,
} from "@pages/products/common/constants"

/**
 * Resolves every inventory_item_id linked to a product's variants — the
 * shared lookup behind both the read-only stock summary and the stock edit
 * drawer, so a simple product (one implicit variant) and a multi-variant
 * product go through the exact same aggregation.
 */
export const useProductInventoryItemIds = (productId: string) => {
  const { variants, isLoading } = useProductVariants(productId, {
    fields: PRODUCT_STOCK_VARIANT_FIELDS,
    limit: PRODUCT_STOCK_VARIANT_LIMIT,
  })

  const inventoryItemIds = (variants ?? []).flatMap(
    (variant) =>
      variant.inventory_items
        ?.map((link) => link.inventory_item_id)
        .filter((id): id is string => !!id) ?? []
  )

  return { inventoryItemIds, isLoading }
}
