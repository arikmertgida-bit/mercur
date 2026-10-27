import { Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { RouteDrawer } from "../../../components/modals";
import { useProduct } from "../../../hooks/api/products";
import { ProductShippingProfileForm } from "./components/product-organization-form";
import { PRODUCT_DETAIL_QUERY } from "../constants";
import { useRequiredParam } from "@mercurjs/dashboard-shared";

export const ProductShippingProfile = () => {
  const id = useRequiredParam("id");
  const { t } = useTranslation();

  const { product, isLoading, isError, error } = useProduct(id, PRODUCT_DETAIL_QUERY);

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer data-testid="product-shipping-profile-drawer">
      <RouteDrawer.Header data-testid="product-shipping-profile-drawer-header">
        <RouteDrawer.Title
          asChild
          data-testid="product-shipping-profile-drawer-title"
        >
          <Heading data-testid="product-shipping-profile-drawer-title-text">
            {t("products.shippingProfile.edit.header")}
          </Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {!isLoading && product && (
        <ProductShippingProfileForm product={product} />
      )}
    </RouteDrawer>
  );
};
