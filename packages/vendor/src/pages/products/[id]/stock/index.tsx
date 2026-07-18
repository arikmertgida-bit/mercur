// Route: /products/:id/stock
import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { RouteDrawer } from "@components/modals"
import { useMultipleInventoryItemLevels } from "@hooks/api/inventory"
import { EditStockForm } from "@pages/products/common/components/edit-stock-form"
import { useProductInventoryItemIds } from "@pages/products/common/hooks/use-product-inventory-item-ids"

export const Component = () => {
  const { id } = useParams()
  const { t } = useTranslation()

  const { inventoryItemIds, isLoading: isLoadingProduct } =
    useProductInventoryItemIds(id!)

  const { inventoryItemsWithLevels, isPending: isLoadingLevels } =
    useMultipleInventoryItemLevels(inventoryItemIds)

  const isLoading = isLoadingProduct || isLoadingLevels

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
