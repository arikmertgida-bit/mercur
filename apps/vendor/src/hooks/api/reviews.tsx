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

export type ReviewReplyDTO = InferClientOutput<
  typeof client.vendor.reviews.$id.replies.query
>["replies"][number];

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

/**
 * Also powers the "Değerlendirmeler" sidebar nav badge (`ReviewsIcon`) via
 * `awaiting_reply_count` — polled + refetched on window focus so the badge
 * stays correct even without a live push, and additionally invalidated by
 * `useUpdateReview` (instant refresh the moment a reply is sent) and by the
 * messenger "new review" socket pulse (instant refresh the moment a
 * customer submits a review) — see `ReviewsIcon`.
 */
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
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    ...options,
  });

  return { ...data, ...rest };
};

export const useReviewReplies = (
  reviewId: string,
  options?: Omit<
    UseQueryOptions<
      unknown,
      ClientError,
      InferClientOutput<typeof client.vendor.reviews.$id.replies.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: reviewsQueryKeys.detail(reviewId, { replies: true }),
    queryFn: async () => client.vendor.reviews.$id.replies.query({ $id: reviewId }),
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
      queryClient.invalidateQueries({ queryKey: reviewsQueryKeys.detail("stats") });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
