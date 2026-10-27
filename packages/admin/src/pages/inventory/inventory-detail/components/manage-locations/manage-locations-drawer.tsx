import { Heading } from "@medusajs/ui"
import { SectionNoAccess, useCan, useRequiredParam } from "@mercurjs/dashboard-shared"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { RouteDrawer } from "../../../../../components/modals"
import { useInventoryItem } from "../../../../../hooks/api/inventory"
import { useStockLocations } from "../../../../../hooks/api/stock-locations"
import { ManageLocationsForm } from "./components/manage-locations-form"

// The owning seller comes from the inventory_item <-> seller link
// (`inventory-item-seller-link.ts`); `seller` is absent from Medusa's own
// HttpTypes, so it is read through this schema instead of a cast — same as
// inventory-stock.tsx.
const SellerOwnedRecordSchema = z.object({
  seller: z.object({ id: z.string() }).nullish(),
})

export const ManageLocationsDrawer = () => {
  const id = useRequiredParam("id")
  const { t } = useTranslation()

  const {
    inventory_item: inventoryItem,
    isPending: isLoading,
    isError,
    error,
  } = useInventoryItem(id, {
    fields: "id,sku,title,*location_levels,seller.id",
  })

  const canViewLocations = useCan("stock_locations")
  const { stock_locations, isLoading: loadingLocations } = useStockLocations(
    undefined,
    { enabled: canViewLocations }
  )

  const ready =
    !isLoading && !loadingLocations && inventoryItem && stock_locations

  if (isError) {
    throw error
  }

  const parsedOwner = SellerOwnedRecordSchema.safeParse(inventoryItem)
  const sellerId = parsedOwner.success
    ? parsedOwner.data.seller?.id
    : undefined

  return (
    <RouteDrawer data-testid="inventory-manage-locations-drawer">
      <RouteDrawer.Header data-testid="inventory-manage-locations-drawer-header">
        <RouteDrawer.Title asChild>
          <Heading data-testid="inventory-manage-locations-drawer-title">{t("inventory.manageLocations")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {!canViewLocations && <SectionNoAccess />}
      {ready && (
        <ManageLocationsForm
          item={inventoryItem}
          locations={stock_locations}
          sellerId={sellerId}
        />
      )}
    </RouteDrawer>
  )
}
