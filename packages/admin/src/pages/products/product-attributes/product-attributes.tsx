import { Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { RouteDrawer } from "../../../components/modals";
import { useProduct } from "../../../hooks/api/products";
import { PRODUCT_DETAIL_QUERY } from "../constants";
import { ProductAttributesForm } from "./components/product-attributes-form";
import { useRequiredParam } from "@mercurjs/dashboard-shared";

export const ProductAttributes = () => {
  const id = useRequiredParam("id");
  const { t } = useTranslation();

  const { product, isLoading, isError, error } = useProduct(id, PRODUCT_DETAIL_QUERY);

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer data-testid="product-attributes-drawer">
      <RouteDrawer.Header data-testid="product-attributes-drawer-header">
        <RouteDrawer.Title
          asChild
          data-testid="product-attributes-drawer-title"
        >
          <Heading data-testid="product-attributes-drawer-title-text">
            {t("products.editAttributes")}
          </Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {!isLoading && product && <ProductAttributesForm product={product} />}
    </RouteDrawer>
  );
};
