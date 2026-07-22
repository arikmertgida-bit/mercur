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

const REVIEWS_QUERY_KEY = "vendor_reviews" as const;
export const reviewsQueryKeys = queryKeysFactory(REVIEWS_QUERY_KEY);

export type ReviewDTO = InferClientOutput<
  typeof client.vendor.reviews.$id.query
>["review"];

export const useReviews = (
  query?: InferClientInput<typeof client.vendor.reviews.query>,
  options?: Omit<
    UseQueryOptions<
      unknown,
      ClientError,
      InferClientOutput<typeof client.vendor.reviews.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: reviewsQueryKeys.list(query),
    queryFn: async () =>
      client.vendor.reviews.query({
        ...query,
      }),
    ...options,
  });

  return { ...data, ...rest };
};

export const useReview = (
  id: string,
  query?: InferClientInput<typeof client.vendor.reviews.$id.query>,
  options?: Omit<
    UseQueryOptions<
      unknown,
      ClientError,
      InferClientOutput<typeof client.vendor.reviews.$id.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: reviewsQueryKeys.detail(id, query),
    queryFn: async () =>
      client.vendor.reviews.$id.query({
        $id: id,
        ...query,
      }),
    ...options,
  });

  return { ...data, ...rest };
};

export const useReviewStats = (
  options?: Omit<
    UseQueryOptions<
      unknown,
      ClientError,
      InferClientOutput<typeof client.vendor.reviews.stats.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: reviewsQueryKeys.detail("stats"),
    queryFn: async () => client.vendor.reviews.stats.query(),
    ...options,
  });

  return { ...data, ...rest };
};

type UpdateReviewPayload = Omit<
  InferClientInput<typeof client.vendor.reviews.$id.mutate>,
  "$id"
>;

export const useUpdateReview = (
  id: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof client.vendor.reviews.$id.mutate>,
    ClientError,
    UpdateReviewPayload
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateReviewPayload) =>
      client.vendor.reviews.$id.mutate({ $id: id, ...payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: reviewsQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reviewsQueryKeys.detail(id) });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
