import { SectionNoAccess, isForbidden, useCan } from "@mercurjs/dashboard-shared"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { z } from "zod"
import { RouteFocusModal } from "../../../components/modals"
import { useInventoryItems, useStockLocations } from "../../../hooks/api"
import { INVENTORY_ITEM_IDS_KEY } from "../common/constants"
import { InventoryStockForm } from "./components/inventory-stock-form"

// Both inventory items (`inventory-item-seller-link.ts`) and stock locations
// (`stock-location-seller-link.ts`) carry a single owning seller through
// their seller link — the `seller` field is absent from Medusa's own
// HttpTypes, so it is read through this schema instead of a cast.
const SellerOwnedRecordSchema = z.object({
  seller: z.object({ id: z.string() }).nullish(),
})

const getOwningSellerId = (record: { id: string }): string | undefined => {
  const parsed = SellerOwnedRecordSchema.safeParse(record)
  return parsed.success ? parsed.data.seller?.id : undefined
}

export const InventoryStock = () => {
  const { t } = useTranslation()
  const canViewLocations = useCan("stock_locations")
  const [searchParams] = useSearchParams()
  const inventoryItemIds =
    searchParams.get(INVENTORY_ITEM_IDS_KEY)?.split(",") || undefined

  const { inventory_items, isPending, isError, error } = useInventoryItems(
    {
      id: inventoryItemIds,
      fields: "id,sku,title,*location_levels,seller.id",
    },
    // Stock is mutated by processes entirely outside this panel (checkout
    // reservations, vendor fulfillments, return restocks) that have no way
    // to invalidate this query — the shared QueryClient's 90s staleTime
    // would otherwise open this editor with a pre-mutation count.
    { staleTime: 0 }
  )

  const {
    stock_locations,
    isPending: isPendingStockLocations,
    isError: isErrorStockLocations,
    error: errorStockLocations,
  } = useStockLocations(
    {
      limit: 9999,
      fields: "id,name,seller.id",
    },
    { enabled: canViewLocations }
  )

  const ready =
    !isPending &&
    !!inventory_items &&
    !isPendingStockLocations &&
    !!stock_locations

  if (isError) {
    throw error
  }

  const noAccess =
    !canViewLocations ||
    (isErrorStockLocations && isForbidden(errorStockLocations))

  if (isErrorStockLocations && !noAccess) {
    throw errorStockLocations
  }

  // Scope the location columns to the warehouses owned by the sellers that
  // own the selected inventory items — a store can only stock at its own
  // locations.
  const sellerIds = new Set(
    (inventory_items ?? [])
      .map(getOwningSellerId)
      .filter((id): id is string => !!id)
  )
  const scopedLocations = (stock_locations ?? []).filter((loc) => {
    const sellerId = getOwningSellerId(loc)
    return !!sellerId && sellerIds.has(sellerId)
  })

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("inventory.stock.title")}</span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description asChild>
        <span className="sr-only">{t("inventory.stock.description")}</span>
      </RouteFocusModal.Description>
      {noAccess && (
        <>
          <RouteFocusModal.Header />
          <RouteFocusModal.Body>
            <SectionNoAccess />
          </RouteFocusModal.Body>
        </>
      )}
      {ready && (
        <InventoryStockForm items={inventory_items} locations={scopedLocations} />
      )}
    </RouteFocusModal>
  )
}
