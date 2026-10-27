import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
} from "@mercurjs/dashboard-shared";
import { useQueryParams } from "@hooks/use-query-params";

type UseMemberTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const useMemberTableQuery = ({
  prefix,
  pageSize = 20,
}: UseMemberTableQueryProps) => {
  const queryObject = useQueryParams(
    ["offset", "order", "created_at", "updated_at"],
    prefix,
  );

  const { offset, created_at, updated_at, order } = queryObject;

  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    order,
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
  };

  return {
    searchParams,
    raw: queryObject,
  };
};
