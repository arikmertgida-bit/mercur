import { useProduct } from "@hooks/api/products";
import { HttpTypes } from "@mercurjs/types";
import { UIMatch } from "react-router-dom";
import { PRODUCT_DETAIL_QUERY } from "../common/constants";

type ProductDetailBreadcrumbProps = UIMatch<HttpTypes.VendorProductResponse>;

export const Breadcrumb = (props: ProductDetailBreadcrumbProps) => {
  const { id } = props.params || {};

  const { product } = useProduct(id ?? "", PRODUCT_DETAIL_QUERY, {
    initialData: props.data,
    enabled: Boolean(id),
  });

  if (!product) {
    return null;
  }

  return <span>{product?.title}</span>;
};
