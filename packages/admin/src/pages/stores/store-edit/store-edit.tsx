import { Heading } from "@medusajs/ui";
import { useLinkQuery, useRequiredParam } from "@mercurjs/dashboard-shared";
import { useTranslation } from "react-i18next";

import { RouteDrawer } from "../../../components/modals";
import { useSeller } from "../../../hooks/api/sellers";
import { StoreEditForm } from "./components/store-edit-form";

export const StoreEdit = () => {
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
          <Heading className="capitalize">
            {t("stores.edit.header")}
          </Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {!isLoading && seller && <StoreEditForm seller={seller} />}
    </RouteDrawer>
  );
};
