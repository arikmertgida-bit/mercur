import { Children, ReactNode } from "react";
import { useLoaderData } from "react-router-dom";

import { SingleColumnPageSkeleton } from "@components/common/skeleton";
import { SingleColumnPage } from "@components/layout/pages";
import { PermissionGuard, WidgetZone, useRequiredParam } from "@mercurjs/dashboard-shared";
import { useProductTag } from "@hooks/api";

import { ProductTagGeneralSection } from "./_components/product-tag-general-section";
import { ProductTagProductSection } from "./_components/product-tag-product-section";

import type { productTagLoader } from "./loader";

const Root = ({ children }: { children?: ReactNode }) => {
  const id = useRequiredParam("id");

  const initialData = useLoaderData<typeof productTagLoader>();

  const { product_tag, isPending, isError, error } = useProductTag(
    id,
    undefined,
    {
      initialData,
    },
  );

  if (isPending || !product_tag) {
    return <SingleColumnPageSkeleton showJSON sections={2} />;
  }

  if (isError) {
    throw error;
  }

  return (
    <SingleColumnPage data={product_tag}>
      {Children.count(children) > 0 ? (
        children
      ) : (
        <WidgetZone id="product-tags.detail.main" data={product_tag}>
          <ProductTagGeneralSection productTag={product_tag} />
          <PermissionGuard permission="products:view">
            <ProductTagProductSection productTag={product_tag} />
          </PermissionGuard>
        </WidgetZone>
      )}
    </SingleColumnPage>
  );
};

export const ProductTagDetailPage = Object.assign(Root, {
  GeneralSection: ProductTagGeneralSection,
  ProductSection: ProductTagProductSection,
});
