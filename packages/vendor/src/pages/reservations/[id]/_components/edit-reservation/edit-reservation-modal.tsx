import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useLinkQuery, SectionNoAccess, usePermissions, useRequiredParam } from "@mercurjs/dashboard-shared"
import { RouteDrawer } from "@components/modals"
import {
  useInventoryItem,
  useInventoryItemLevels,
} from "@hooks/api/inventory"
import { useReservationItem } from "@hooks/api/reservations"
import { useStockLocations } from "@hooks/api/stock-locations"
import { EditReservationForm } from "./components/edit-reservation-form"

export const ReservationEdit = () => {
  const id = useRequiredParam("id")
  const { t } = useTranslation()

  const { reservation, isPending, isError, error } = useReservationItem(
    id,
    useLinkQuery("reservation")
  )
  const { can } = usePermissions()
  const canViewItem = can("inventory_items")
  const canViewLocations = can("stock_locations")

  const { inventory_item: inventoryItem } = useInventoryItem(
    reservation?.inventory_item_id ?? "",
    undefined,
    {
      enabled: !!reservation?.inventory_item_id && canViewItem,
    }
  )

  const { inventory_levels } = useInventoryItemLevels(inventoryItem?.id ?? "", undefined, {
    enabled: !!inventoryItem?.id && canViewItem,
  })

  const { stock_locations } = useStockLocations(
    { id: inventory_levels?.map((l) => l.location_id) },
    {
      enabled: !!inventory_levels && canViewLocations,
    }
  )

  const ready = !isPending && reservation && inventoryItem && inventory_levels && stock_locations
  if (isError) {
    throw error
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("inventory.reservation.editItemDetails")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {!(canViewItem && canViewLocations) ? (
        <RouteDrawer.Body>
          <SectionNoAccess className="p-0" />
        </RouteDrawer.Body>
      ) : (
        ready && (
          <EditReservationForm
            locations={stock_locations}
            reservation={reservation}
            item={{ ...inventoryItem, location_levels: inventory_levels }}
          />
        )
      )}
    </RouteDrawer>
  )
}
