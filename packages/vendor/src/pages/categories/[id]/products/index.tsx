import { useRequiredParam } from "@mercurjs/dashboard-shared"
// Route: /categories/:id/products
import { RouteFocusModal } from "@components/modals";
import { useProductCategory } from "@hooks/api";
import { EditCategoryProductsForm } from "./edit-category-products-form";

export const Component = () => {
  const id = useRequiredParam("id");
  const { product_category, isLoading, isError, error } = useProductCategory(
    id,
    { fields: "*products" },
  );

  if (isError) {
    throw error;
  }

  return (
    <RouteFocusModal>
      {!isLoading && product_category && (
        <EditCategoryProductsForm
          categoryId={id}
          products={product_category.products}
        />
      )}
    </RouteFocusModal>
  );
};
