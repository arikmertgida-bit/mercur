import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";
import { client } from "../../lib/client";
import {
  ClientError,
  InferClientInput,
  InferClientOutput,
} from "@mercurjs/client";

const REVIEW_REPORTS_QUERY_KEY = "vendor_review_reports" as const;
export const reviewReportsQueryKeys = queryKeysFactory(REVIEW_REPORTS_QUERY_KEY);

export type ReviewReportDTO = InferClientOutput<
  typeof client.vendor.reviewReports.query
>["reports"][number];

export const useReviewReports = (
  query?: InferClientInput<typeof client.vendor.reviewReports.query>,
  options?: Omit<
    UseQueryOptions<
      unknown,
      ClientError,
      InferClientOutput<typeof client.vendor.reviewReports.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: reviewReportsQueryKeys.list(query),
    queryFn: async () => client.vendor.reviewReports.query({ ...query }),
    ...options,
  });

  return { ...data, ...rest };
};

export const useCreateReviewReport = (
  options?: UseMutationOptions<
    InferClientOutput<typeof client.vendor.reviewReports.mutate>,
    ClientError,
    InferClientInput<typeof client.vendor.reviewReports.mutate>
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      payload: InferClientInput<typeof client.vendor.reviewReports.mutate>,
    ) => client.vendor.reviewReports.mutate(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: reviewReportsQueryKeys.lists() });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
