import { Heading } from "@medusajs/ui";
import { useLinkQuery, useRequiredParam } from "@mercurjs/dashboard-shared";
import { useTranslation } from "react-i18next";

import { RouteDrawer } from "../../../components/modals";
import { useSeller } from "../../../hooks/api/sellers";
import { StorePaymentDetailsForm } from "./components/store-payment-details-form";

export const StorePaymentDetailsEdit = () => {
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
            {t("store.paymentDetails.edit.header")}
          </Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("store.paymentDetails.edit.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {!isLoading && seller && <StorePaymentDetailsForm seller={seller} />}
    </RouteDrawer>
  );
};
