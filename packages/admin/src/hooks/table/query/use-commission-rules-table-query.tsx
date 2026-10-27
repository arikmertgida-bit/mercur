import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared";
import type { FindParams, HttpTypes } from "@medusajs/types";

import { useQueryParams } from "@/hooks/use-query-params";

type UseCommissionRulesTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const useCommissionRulesTableQuery = ({
  prefix,
  pageSize = 20,
}: UseCommissionRulesTableQueryProps) => {
  const queryObject = useQueryParams(
    ["offset", "q", "order", "created_at", "updated_at"],
    prefix,
  );

  const { offset, q, order, created_at, updated_at } = queryObject;

  const searchParams: FindParams & HttpTypes.AdminRegionFilters = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    order,
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    q,
  };

  return {
    searchParams,
    raw: queryObject,
  };
};
