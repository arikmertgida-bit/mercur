import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared";
import { useQueryParams } from "../../use-query-params";

type UseAttributeTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const useAttributeTableQuery = ({
  prefix,
  pageSize = 20,
}: UseAttributeTableQueryProps) => {
  const queryObject = useQueryParams(
    ["offset", "q", "order", "created_at", "updated_at", "is_filterable"],
    prefix,
  );

  const { offset, q, order, created_at, updated_at, is_filterable } =
    queryObject;

  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    order,
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    is_filterable:
      is_filterable !== undefined ? is_filterable === "true" : undefined,
    q,
  };

  return {
    searchParams,
    raw: queryObject,
  };
};
