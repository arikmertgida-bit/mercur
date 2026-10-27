import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useLinkQuery, useRequiredParam } from "@mercurjs/dashboard-shared"
import { RouteDrawer } from "@components/modals"
import { useInventoryItem } from "@hooks/api/inventory"
import { EditInventoryItemForm } from "./components/edit-item-form"

export const InventoryItemEdit = () => {
  const id = useRequiredParam("id")
  const { t } = useTranslation()

  const {
    inventory_item: inventoryItem,
    isPending: isLoading,
    isError,
    error,
  } = useInventoryItem(id, useLinkQuery("inventory_item"))

  const ready = !isLoading && inventoryItem

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("inventory.editItemDetails")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {ready && <EditInventoryItemForm item={inventoryItem} />}
    </RouteDrawer>
  )
}
