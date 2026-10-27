import { HttpTypes } from "@medusajs/types";
import type { JsonValue } from "@mercurjs/types";
import { z } from "zod";

import { useQueryParams } from "../../use-query-params";

// The parts of a table filter (built-in or contributed by a custom-fields
// config) that decide how its query param is read.
type ExtraFilter = {
  key: string;
  type?: string;
  multiple?: boolean;
};

type UseOrderTableQueryProps = {
  prefix?: string;
  pageSize?: number;
  extraFilters?: ExtraFilter[];
};

type VendorOrderFilters = HttpTypes.AdminOrderFilters & {
  status?: string[];
  customer_id?: string[];
  request?: string[];
};

// Query params a custom-fields filter writes, keyed by the filter's `key`.
type ExtraFilterParams = Record<string, JsonValue>;

// Date and number filters are stored as JSON in the URL; a hand-edited or
// truncated value is ignored instead of crashing the page.
const parseJsonParam = (value: string): JsonValue | undefined => {
  try {
    const parsed: JsonValue = JSON.parse(value);
    return parsed;
  } catch {
    return undefined;
  }
};

// The comparisons the date filter writes.
const DateComparisonSchema = z.object({
  $gte: z.string().optional(),
  $lte: z.string().optional(),
  $gt: z.string().optional(),
  $lt: z.string().optional(),
});

const parseDateParam = (
  value: string | undefined
): z.infer<typeof DateComparisonSchema> | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = DateComparisonSchema.safeParse(parseJsonParam(value));
  return parsed.success ? parsed.data : undefined;
};

const BASE_KEYS = [
  "offset",
  "q",
  "created_at",
  "updated_at",
  "region_id",
  "sales_channel_id",
  "customer_id",
  "status",
  "request",
  "order",
];

export const useOrderTableQuery = ({
  prefix,
  pageSize = 20,
  extraFilters = [],
}: UseOrderTableQueryProps) => {
  const extraKeys = extraFilters
    .map((f) => f.key)
    .filter((key) => !BASE_KEYS.includes(key));

  const queryObject = useQueryParams([...BASE_KEYS, ...extraKeys], prefix);

  const {
    offset,
    created_at,
    updated_at,
    region_id,
    sales_channel_id,
    customer_id,
    status,
    request,
    q,
    order,
  } = queryObject;

  const searchParams: VendorOrderFilters = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    region_id: region_id?.split(","),
    sales_channel_id: sales_channel_id?.split(","),
    customer_id: customer_id?.split(","),
    status: status?.split(","),
    request: request?.split(","),
    created_at: parseDateParam(created_at),
    updated_at: parseDateParam(updated_at),
    order: order ? order : "-display_id",
    q,
  };

  const extraParams: ExtraFilterParams = {};

  for (const filter of extraFilters) {
    const value = queryObject[filter.key];
    if (!value || BASE_KEYS.includes(filter.key)) {
      continue;
    }
    const parsed =
      filter.type === "date" || filter.type === "number"
        ? parseJsonParam(value)
        : filter.type === "select" && filter.multiple
          ? value.split(",")
          : value;
    if (parsed !== undefined) {
      extraParams[filter.key] = parsed;
    }
  }

  return {
    searchParams: { ...extraParams, ...searchParams },
    raw: queryObject,
  };
};
