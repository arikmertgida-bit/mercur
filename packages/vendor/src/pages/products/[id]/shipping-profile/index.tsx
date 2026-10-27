import { useRequiredParam } from "@mercurjs/dashboard-shared"
// Route: /products/:id/shipping-profile
import { Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { RouteDrawer } from "@components/modals";
import { useProduct } from "@hooks/api/products";
import { ProductShippingProfileForm } from "./product-organization-form";

export const Component = () => {
  const id = useRequiredParam("id");
  const { t } = useTranslation();

  const { product, isLoading, isError, error } = useProduct(id, {
    fields:
      "*shipping_profile,-type,-collection,-options,-tags,-images,-variants,-sales_channels",
  });

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("products.shippingProfile.edit.header")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {!isLoading && product && (
        <ProductShippingProfileForm product={product} />
      )}
    </RouteDrawer>
  );
};
