import { RouteFocusModal } from "../../../components/modals";
import { TabbedForm } from "../../../components/tabbed-form/tabbed-form";
import { StoreCreateForm } from "./components/store-create-form";
import { StoreCreateDetailsTab } from "./components/store-create-details-tab";
import { StoreCreateUsersTab } from "./components/store-create-users-tab";
import { CreateStoreSchema, CreateStoreSchemaType } from "./components/schema";
import { useTranslation } from "react-i18next";

const Root = () => {
  const { t } = useTranslation();
  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("stores.create.header")}</span>
      </RouteFocusModal.Title>
      <StoreCreateForm />
    </RouteFocusModal>
  );
};

export const StoreCreatePage = Object.assign(Root, {
  Form: StoreCreateForm,
  DetailsTab: StoreCreateDetailsTab,
  UsersTab: StoreCreateUsersTab,
  Tab: TabbedForm.Tab,
});

export type { CreateStoreSchemaType };
export { CreateStoreSchema };

export const Component = Root;
