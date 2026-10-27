import { useLinkQuery, DateComparisonFilterSchema, parseJsonQueryParam } from "@mercurjs/dashboard-shared";
import { useQueryParams } from "@hooks/use-query-params";
import { SellerStatus } from "@mercurjs/types";

type UseSellersTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

const ACTIVE_STATUSES = [
  SellerStatus.OPEN,
  SellerStatus.PENDING_APPROVAL,
  SellerStatus.SUSPENDED,
];

export const useSellersTableQuery = ({
  prefix,
  pageSize = 20,
}: UseSellersTableQueryProps) => {
  const linkQuery = useLinkQuery("seller");
  const queryObject = useQueryParams(
    ["offset", "q", "created_at", "updated_at", "status", "is_premium", "order"],
    prefix,
  );

  const { offset, created_at, updated_at, status, is_premium, q, order } = queryObject;

  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    status: status?.split(",") ?? ACTIVE_STATUSES,
    is_premium: is_premium ? is_premium === "true" : undefined,
    q,
    order: order ? order : "-created_at",
    ...linkQuery,
  };

  return {
    searchParams,
    raw: queryObject,
  };
};
