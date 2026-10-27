import {
  DateComparisonFilterSchema,
  parseJsonQueryParam,
  useQueryParams,
} from "@mercurjs/dashboard-shared";
import { z } from "zod";

// The status filter is a multi-select, written to the URL comma-separated.
const RequestStatusParamSchema = z.array(
  z.enum(["draft", "pending", "accepted", "rejected"]),
);

const parseRequestStatus = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const parsed = RequestStatusParamSchema.safeParse(value.split(","));
  return parsed.success ? parsed.data : undefined;
};

type UseRequestTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

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
    created_at: parseJsonQueryParam(created_at, DateComparisonFilterSchema),
    updated_at: parseJsonQueryParam(updated_at, DateComparisonFilterSchema),
    order: order ? order : "-created_at",
    request_status: parseRequestStatus(request_status),
    q,
  };

  return {
    searchParams,
    raw: queryObject,
  };
};
