import { useQueryParams } from "@mercurjs/dashboard-shared";

type UseRequestTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

type DateOperatorMap = {
  gt?: string;
  gte?: string;
  lt?: string;
  lte?: string;
};

const parseOperatorMap = (value: string | undefined): DateOperatorMap | undefined => {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const REQUEST_STATUS_VALUES = ["draft", "pending", "accepted", "rejected"] as const;
type RequestStatusValue = (typeof REQUEST_STATUS_VALUES)[number];

const isRequestStatusValue = (value: string): value is RequestStatusValue =>
  REQUEST_STATUS_VALUES.some((status) => status === value);

const parseRequestStatus = (value: string | undefined): RequestStatusValue | undefined =>
  value && isRequestStatusValue(value) ? value : undefined;

export const useRequestTableQuery = ({
  prefix,
  pageSize = 20,
}: UseRequestTableQueryProps) => {
  const queryObject = useQueryParams(
    ["offset", "q", "created_at", "updated_at", "order", "request_status"],
    prefix,
  );

  const { offset, created_at, updated_at, q, order, request_status } = queryObject;

  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    created_at: parseOperatorMap(created_at),
    updated_at: parseOperatorMap(updated_at),
    order: order ?? "-created_at",
    request_status: parseRequestStatus(request_status),
    q,
  };

  return {
    searchParams,
    raw: queryObject,
  };
};
