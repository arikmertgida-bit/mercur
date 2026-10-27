import { ProductStatus } from "@mercurjs/types/product";
import { z } from "zod";
import { useLinkQuery, DateComparisonFilterSchema, parseJsonQueryParam } from "@mercurjs/dashboard-shared";
import { useQueryParams } from "@hooks/use-query-params";

// The status filter comes from the URL, so unknown values are dropped.
const ProductStatusSchema = z.enum(ProductStatus);

const parseProductStatuses = (
  value: string | undefined,
): ProductStatus[] | undefined =>
  value?.split(",").flatMap((entry) => {
    const parsed = ProductStatusSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });

type UseProductTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

const DEFAULT_FIELDS =
  "id,title,handle,status,*collection,*categories,variants.id,thumbnail";

export const useProductTableQuery = ({
  prefix,
  pageSize = 20,
}: UseProductTableQueryProps) => {
  const linkQuery = useLinkQuery("product", DEFAULT_FIELDS);
  const queryObject = useQueryParams(
    [
      "offset",
      "order",
      "q",
      "created_at",
      "updated_at",
      "category_id",
      "collection_id",
      "tag_id",
      "type_id",
      "status",
      "id",
    ],
    prefix,
  );

  const {
    offset,
    created_at,
    updated_at,
    category_id,
    collection_id,
    tag_id,
    type_id,
    status,
    order,
    q,
  } = queryObject;

  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    category_id: category_id?.split(","),
    collection_id: collection_id?.split(","),
    order: order ?? "-title",
    tag_id: tag_id ? tag_id.split(",") : undefined,
    type_id: type_id?.split(","),
    status: parseProductStatuses(status),
    q,
    fields: linkQuery.fields,
  };

  return {
    searchParams,
    raw: queryObject,
  };
};
