import { useQueryParams } from "@mercurjs/dashboard-shared";

type UseReviewTableQueryProps = {
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

export const useReviewTableQuery = ({
  prefix,
  pageSize = 20,
}: UseReviewTableQueryProps) => {
  const queryObject = useQueryParams(
    ["offset", "q", "created_at", "updated_at", "order"],
    prefix,
  );

  const { offset, created_at, updated_at, q, order } = queryObject;

  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    created_at: parseOperatorMap(created_at),
    updated_at: parseOperatorMap(updated_at),
    order: order ?? "-created_at",
    q,
  };

  return {
    searchParams,
    raw: queryObject,
  };
};
