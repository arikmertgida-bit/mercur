import { useRequiredParam } from "@mercurjs/dashboard-shared"
// Route: /products/:id/attributes
import { Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { RouteDrawer } from "@components/modals";
import { useProduct } from "@hooks/api/products";
import { ProductAttributesForm } from "./product-attributes-form";

export const Component = () => {
  const id = useRequiredParam("id");
  const { t } = useTranslation();

  const { product, isLoading, isError, error } = useProduct(id);

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("products.editAttributes")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {!isLoading && product && <ProductAttributesForm product={product} />}
    </RouteDrawer>
  );
};
