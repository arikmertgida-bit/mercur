import { Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { RouteDrawer } from "../../../components/modals";
import { CreateAttributeForm } from "./components/create-attribute-form";
import { useRequiredParam } from "@mercurjs/dashboard-shared";

export const ProductCreateAttribute = () => {
  const id = useRequiredParam("id");
  const { t } = useTranslation();

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("products.addAttribute")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      <CreateAttributeForm productId={id} />
    </RouteDrawer>
  );
};
