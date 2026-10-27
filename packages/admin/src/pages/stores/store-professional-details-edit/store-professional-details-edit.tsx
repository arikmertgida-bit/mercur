import { Heading } from "@medusajs/ui";
import { useLinkQuery, useRequiredParam } from "@mercurjs/dashboard-shared";
import { useTranslation } from "react-i18next";

import { RouteDrawer } from "../../../components/modals";
import { useSeller } from "../../../hooks/api/sellers";
import { StoreProfessionalDetailsForm } from "./components/store-professional-details-form";

export const StoreProfessionalDetailsEdit = () => {
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
            {t("store.professionalDetails.edit.header")}
          </Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("store.professionalDetails.edit.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {!isLoading && seller && (
        <StoreProfessionalDetailsForm seller={seller} />
      )}
    </RouteDrawer>
  );
};
