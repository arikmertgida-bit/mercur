import { useRequiredParam } from "@mercurjs/dashboard-shared"

import { RouteFocusModal } from "@components/modals";

import { AddCustomersForm } from "./components/add-customers-form";
import { useTranslation } from "react-i18next";

export const CustomerGroupAddCustomers = () => {
  const { t } = useTranslation();
  const id = useRequiredParam("id");

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("customers.domain")}</span>
      </RouteFocusModal.Title>
      <AddCustomersForm customerGroupId={id} />
    </RouteFocusModal>
  );
};
