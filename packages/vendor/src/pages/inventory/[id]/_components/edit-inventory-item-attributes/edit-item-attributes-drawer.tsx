import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { RouteDrawer } from "@components/modals"
import { useInventoryItem } from "@hooks/api/inventory"
import { EditInventoryItemAttributesForm } from "./components/edit-item-attributes-form"

export const InventoryItemAttributesEdit = () => {
  const id = useRequiredParam("id")
  const { t } = useTranslation()

  const {
    inventory_item: inventoryItem,
    isPending: isLoading,
    isError,
    error,
  } = useInventoryItem(id)

  const ready = !isLoading && inventoryItem

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("products.editAttributes")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {ready && <EditInventoryItemAttributesForm item={inventoryItem} />}
    </RouteDrawer>
  )
}
