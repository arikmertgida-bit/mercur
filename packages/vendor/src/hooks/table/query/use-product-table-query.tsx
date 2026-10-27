import { HttpTypes } from "@medusajs/types";
import { useLinkQuery, DateComparisonFilterSchema, parseJsonQueryParam } from "@mercurjs/dashboard-shared";
import { z } from "zod";
import { useQueryParams } from "../../use-query-params";

type UseProductTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

// The status filter comes from the URL, so unknown values are dropped.
const ProductStatusSchema = z.enum(["draft", "proposed", "published", "rejected"]);

const parseProductStatuses = (
  value: string | undefined,
): HttpTypes.AdminProductStatus[] | undefined =>
  value?.split(",").flatMap((entry) => {
    const parsed = ProductStatusSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });

export const DEFAULT_FIELDS =
  // TODO: Remove exclusion once we avoid including unnecessary relations by default in the query config
  "id,title,handle,status,*collection,categories.id,categories.name,variants.id,thumbnail,-type,-tags,-images,-variants";

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
      "sales_channel_id",
      "category_id",
      "collection_id",
      "is_giftcard",
      "tag_id",
      "type_id",
      "status",
      "id",
    ],
    prefix,
  );

  const {
    offset,
    sales_channel_id,
    created_at,
    updated_at,
    category_id,
    collection_id,
    tag_id,
    type_id,
    is_giftcard,
    status,
    order,
    q,
  } = queryObject;

  const searchParams: HttpTypes.AdminProductListParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    sales_channel_id: sales_channel_id?.split(","),
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    category_id: category_id?.split(","),
    collection_id: collection_id?.split(","),
    is_giftcard: is_giftcard ? is_giftcard === "true" : undefined,
    order: order || "-created_at",
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
