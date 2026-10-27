import { ReactNode, Children } from "react"
import { useLoaderData } from "react-router-dom"
import { z } from "zod"

import {
  PermissionGuard,
  useLinkQuery,
  useRequiredParam,
  WidgetZone,
} from "@mercurjs/dashboard-shared"

import { TwoColumnPageSkeleton } from "@components/common/skeleton"
import { TwoColumnPage } from "@components/layout/pages"
import { useInventoryItem } from "@hooks/api"

import { InventoryItemAttributeSection } from "./components/inventory-item-attributes/attributes-section"
import { InventoryItemGeneralSection } from "./components/inventory-item-general-section"
import { InventoryItemLocationLevelsSection } from "./components/inventory-item-location-levels"
import { InventoryItemReservationsSection } from "./components/inventory-item-reservations"
import {
  InventoryItemVariantSchema,
  InventoryItemVariantsSection,
} from "./components/inventory-item-variants/variants-section"
import { INVENTORY_DETAIL_FIELDS } from "./constants"

import type { inventoryItemLoader } from "./loader"

// Medusa's inventory item type has no `variants`; the detail query expands
// them (see INVENTORY_DETAIL_FIELDS), so they are read from the response.
const InventoryItemVariantsSchema = z.object({
  variants: z.array(InventoryItemVariantSchema).nullish(),
})

const Root = ({ children }: { children?: ReactNode }) => {
  const id = useRequiredParam("id")
  const initialData = useLoaderData<typeof inventoryItemLoader>()

  const {
    inventory_item,
    isPending: isLoading,
    isError,
    error,
  } = useInventoryItem(
    id,
    useLinkQuery("inventory_item", INVENTORY_DETAIL_FIELDS),
    {
      initialData,
    }
  )

  if (isLoading || !inventory_item) {
    return (
      <TwoColumnPageSkeleton
        showJSON
        mainSections={3}
        sidebarSections={2}
        showMetadata
      />
    )
  }

  if (isError) {
    throw error
  }

  const parsedVariants = InventoryItemVariantsSchema.safeParse(inventory_item)
  const variants = parsedVariants.success
    ? (parsedVariants.data.variants ?? [])
    : []

  return Children.count(children) > 0 ? (
    <TwoColumnPage data={inventory_item} showJSON showMetadata data-testid="inventory-detail-page">
      {children}
    </TwoColumnPage>
  ) : (
    <TwoColumnPage data={inventory_item} showJSON showMetadata data-testid="inventory-detail-page">
      <TwoColumnPage.Main data-testid="inventory-detail-main">
        <WidgetZone id="inventory.detail.main" data={inventory_item}>
          <InventoryItemGeneralSection inventoryItem={inventory_item} />
          <InventoryItemLocationLevelsSection
            inventoryItem={inventory_item}
          />
          <PermissionGuard permission="reservations:view">
            <InventoryItemReservationsSection inventoryItem={inventory_item} />
          </PermissionGuard>
        </WidgetZone>
      </TwoColumnPage.Main>
      <TwoColumnPage.Sidebar data-testid="inventory-detail-sidebar">
        <WidgetZone id="inventory.detail.side" data={inventory_item}>
          {variants.length > 0 && (
            <InventoryItemVariantsSection variants={variants} />
          )}
          <InventoryItemAttributeSection inventoryItem={inventory_item} />
        </WidgetZone>
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}

export const InventoryDetailPage = Object.assign(Root, {
  Main: TwoColumnPage.Main,
  Sidebar: TwoColumnPage.Sidebar,
  MainGeneralSection: InventoryItemGeneralSection,
  MainLocationLevelsSection: InventoryItemLocationLevelsSection,
  MainReservationsSection: InventoryItemReservationsSection,
  SidebarVariantsSection: InventoryItemVariantsSection,
  SidebarAttributeSection: InventoryItemAttributeSection,
})
