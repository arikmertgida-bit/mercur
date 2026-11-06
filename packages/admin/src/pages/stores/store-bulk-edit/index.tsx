import { useTranslation } from "react-i18next";

import { RouteFocusModal } from "../../../components/modals";

import { StoreBulkEditForm } from "./components/store-bulk-edit-form";

const Root = () => {
  const { t } = useTranslation();

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("stores.domain")}</span>
      </RouteFocusModal.Title>
      <StoreBulkEditForm />
    </RouteFocusModal>
  );
};

export const StoreBulkEditPage = Object.assign(Root, {
  Form: StoreBulkEditForm,
});

export const Component = Root;
