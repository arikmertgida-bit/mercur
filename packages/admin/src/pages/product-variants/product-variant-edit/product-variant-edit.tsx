import { Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { useLoaderData, useParams, useSearchParams } from "react-router-dom";
import { useRequiredParam } from "@mercurjs/dashboard-shared";
import { RouteDrawer } from "../../../components/modals";
import { useProduct, useProductVariant } from "../../../hooks/api/products";
import { ProductEditVariantForm } from "./components/product-edit-variant-form";
import { editProductVariantLoader } from "./loader";
import { resolveEditVariantId } from "./variant-id";

export const ProductVariantEdit = () => {
  const initialData = useLoaderData<typeof editProductVariantLoader>();

  const { t } = useTranslation();
  const id = useRequiredParam("id");
  const { variant_id } = useParams();
  const [URLSearchParms] = useSearchParams();
  const variantId = resolveEditVariantId(
    variant_id,
    URLSearchParms.get("variant_id"),
  );

  const { variant, isPending, isError, error } = useProductVariant(
    id,
    variantId,
    { fields: "*options,*options.option" },
    {
      initialData,
    },
  );

  const {
    product,
    isPending: isProductPending,
    isError: isProductError,
    error: productError,
  } = useProduct(
    id,
    {
      fields: "-variants",
    },
    {
      enabled: !!variant,
    },
  );

  const ready = !isPending && !!variant && !isProductPending && !!product;

  if (isError) {
    throw error;
  }

  if (isProductError) {
    throw productError;
  }

  return (
    <RouteDrawer data-testid="product-variant-edit-drawer">
      <RouteDrawer.Header data-testid="product-variant-edit-drawer-header">
        <RouteDrawer.Title
          asChild
          data-testid="product-variant-edit-drawer-title"
        >
          <Heading data-testid="product-variant-edit-drawer-title-text">
            {t("products.variant.edit.header")}
          </Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {ready && <ProductEditVariantForm variant={variant} product={product} />}
    </RouteDrawer>
  );
};
