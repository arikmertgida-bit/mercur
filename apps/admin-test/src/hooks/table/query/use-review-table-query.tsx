import { useQueryParams } from "@mercurjs/dashboard-shared";
import type { InferClientInput } from "@mercurjs/client";
import { client } from "../../../lib/client";

type UseReviewTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const useReviewTableQuery = ({
  prefix,
  pageSize = 20,
}: UseReviewTableQueryProps) => {
  // The review-report list endpoint accepts pagination and ordering only.
  const queryObject = useQueryParams(["offset", "order"], prefix);

  const { offset, order } = queryObject;

  const searchParams: InferClientInput<typeof client.admin.reviewReports.query> = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    order: order ? order : "-created_at",
  };

  return {
    searchParams,
    raw: queryObject,
  };
};
