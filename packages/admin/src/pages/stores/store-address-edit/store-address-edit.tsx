import { Heading } from "@medusajs/ui";
import { useLinkQuery, useRequiredParam } from "@mercurjs/dashboard-shared";
import { useTranslation } from "react-i18next";

import { RouteDrawer } from "../../../components/modals";
import { useSeller } from "../../../hooks/api/sellers";
import { StoreAddressEditForm } from "./components/store-address-edit-form";

export const StoreAddressEdit = () => {
  const id = useRequiredParam("id");
  const { t } = useTranslation();

  const query = useLinkQuery("seller");
  const { seller, isLoading, isError, error } = useSeller(id, query);

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>
            {t("store.address.edit.header")}
          </Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("store.address.edit.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {!isLoading && seller && <StoreAddressEditForm seller={seller} />}
    </RouteDrawer>
  );
};
