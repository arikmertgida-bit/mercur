import { Children, ReactNode } from "react";
import { useLoaderData } from "react-router-dom";

import { TwoColumnPageSkeleton } from "@components/common/skeleton";
import { TwoColumnPage } from "@components/layout/pages";
import { useLinkQuery, WidgetZone, useRequiredParam } from "@mercurjs/dashboard-shared";
import { useInventoryItem } from "@hooks/api/inventory";

import { InventoryItemAttributeSection } from "./_components/inventory-item-attributes/attributes-section";
import { InventoryItemGeneralSection } from "./_components/inventory-item-general-section";
import { InventoryItemLocationLevelsSection } from "./_components/inventory-item-location-levels";
import { InventoryItemReservationsSection } from "./_components/inventory-item-reservations";
import { InventoryItemVariantsSection } from "./_components/inventory-item-variants/variants-section";
import { INVENTORY_DETAIL_FIELDS } from "./constants";

import { loader } from "./loader";

const Root = ({ children }: { children?: ReactNode }) => {
  const id = useRequiredParam("id");
  const initialData = useLoaderData<typeof loader>();
  const {
    inventory_item,
    isPending: isLoading,
    isError,
    error,
  } = useInventoryItem(
    id,
    useLinkQuery("inventory_item", INVENTORY_DETAIL_FIELDS),
    { initialData },
  );

  if (isLoading || !inventory_item) {
    return (
      <TwoColumnPageSkeleton
        showJSON
        mainSections={3}
        sidebarSections={2}
        showMetadata
      />
    );
  }

  if (isError) {
    throw error;
  }

  return (
    <>
      {Children.count(children) > 0 ? (
        children
      ) : (
        <TwoColumnPage data={inventory_item} showJSON showMetadata>
          <TwoColumnPage.Main>
            <WidgetZone id="inventory.detail.main" data={inventory_item}>
              <InventoryItemGeneralSection inventoryItem={inventory_item} />
              <InventoryItemLocationLevelsSection
                inventoryItem={inventory_item}
              />
              <InventoryItemReservationsSection
                inventoryItem={inventory_item}
              />
            </WidgetZone>
          </TwoColumnPage.Main>
          <TwoColumnPage.Sidebar>
            <WidgetZone id="inventory.detail.side" data={inventory_item}>
              <InventoryItemVariantsSection
                variants={inventory_item.variants ?? []}
              />
              <InventoryItemAttributeSection
                inventoryItem={inventory_item}
              />
            </WidgetZone>
          </TwoColumnPage.Sidebar>
        </TwoColumnPage>
      )}
    </>
  );
};

export const InventoryDetailPage = Object.assign(Root, {
  Main: TwoColumnPage.Main,
  Sidebar: TwoColumnPage.Sidebar,
  MainGeneralSection: InventoryItemGeneralSection,
  MainLocationLevelsSection: InventoryItemLocationLevelsSection,
  MainReservationsSection: InventoryItemReservationsSection,
  SidebarVariantsSection: InventoryItemVariantsSection,
  SidebarAttributeSection: InventoryItemAttributeSection,
});
