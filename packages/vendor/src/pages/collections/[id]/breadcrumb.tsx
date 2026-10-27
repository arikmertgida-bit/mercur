import { HttpTypes } from "@mercurjs/types";
import { UIMatch } from "react-router-dom";

import { useCollection } from "@hooks/api/collections";

type CollectionDetailBreadcrumbProps =
  UIMatch<HttpTypes.VendorCollectionResponse>;

export const Breadcrumb = (props: CollectionDetailBreadcrumbProps) => {
  const { id } = props.params || {};
  const { collection } = useCollection(id ?? "", undefined, {
    initialData: props.data,
  });

  if (!collection) return null;
  return <span>{collection.title}</span>;
};
