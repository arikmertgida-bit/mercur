// Route: /products/:id/variants/:variant_id/stock
import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { RouteDrawer } from "@components/modals"
import { useMultipleInventoryItemLevels } from "@hooks/api/inventory"
import { useProductVariant } from "@hooks/api/products"
import { EditStockForm } from "@pages/products/common/components/edit-stock-form"

const VARIANT_STOCK_FIELDS = "id,inventory_items.inventory_item_id"

export const Component = () => {
  const { id, product_id, variant_id } = useParams()
  const productId = id || product_id
  const { t } = useTranslation()

  const { variant, isLoading: isLoadingVariant } = useProductVariant(
    productId!,
    variant_id!,
    { fields: VARIANT_STOCK_FIELDS }
  )

  const inventoryItemIds = (variant?.inventory_items ?? [])
    .map((link) => link.inventory_item_id)
    .filter((itemId): itemId is string => !!itemId)

  const { inventoryItemsWithLevels, isPending: isLoadingLevels } =
    useMultipleInventoryItemLevels(inventoryItemIds)

  const isLoading = isLoadingVariant || isLoadingLevels

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("products.stock.edit.header")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("products.stock.edit.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {!isLoading && (
        <EditStockForm inventoryItemsWithLevels={inventoryItemsWithLevels} />
      )}
    </RouteDrawer>
  )
}
