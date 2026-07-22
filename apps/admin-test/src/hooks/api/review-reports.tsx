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

const REVIEW_REPORTS_QUERY_KEY = "admin_review_reports" as const;
export const reviewReportsQueryKeys = queryKeysFactory(REVIEW_REPORTS_QUERY_KEY);

export type ReviewReportRowDTO = InferClientOutput<
  typeof client.admin.reviewReports.query
>["reports"][number];

export type ReviewReportDetailDTO = InferClientOutput<
  typeof client.admin.reviewReports.$id.query
>["report"];

export const useReviewReports = (
  query?: InferClientInput<typeof client.admin.reviewReports.query>,
  options?: Omit<
    UseQueryOptions<
      unknown,
      ClientError,
      InferClientOutput<typeof client.admin.reviewReports.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: reviewReportsQueryKeys.list(query),
    queryFn: async () => client.admin.reviewReports.query({ ...query }),
    ...options,
  });

  return { ...data, ...rest };
};

export const useReviewReport = (
  id: string,
  options?: Omit<
    UseQueryOptions<
      unknown,
      ClientError,
      InferClientOutput<typeof client.admin.reviewReports.$id.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: reviewReportsQueryKeys.detail(id),
    queryFn: async () => client.admin.reviewReports.$id.query({ $id: id }),
    ...options,
  });

  return { ...data, ...rest };
};

type ResolveReviewReportPayload = Omit<
  InferClientInput<typeof client.admin.reviewReports.$id.resolve.mutate>,
  "$id"
>;

export const useResolveReviewReport = (
  id: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof client.admin.reviewReports.$id.resolve.mutate>,
    ClientError,
    ResolveReviewReportPayload
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ResolveReviewReportPayload) =>
      client.admin.reviewReports.$id.resolve.mutate({ $id: id, ...payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: reviewReportsQueryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: reviewReportsQueryKeys.detail(id),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
