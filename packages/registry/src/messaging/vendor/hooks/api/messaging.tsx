import {
  InfiniteData,
  QueryKey,
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query"
import { queryKeysFactory } from "@mercurjs/dashboard-shared"
import { ClientError } from "@mercurjs/client"
import { z } from "zod"
import {
  BuyerOrderSummarySchema,
  ConversationDetailResponse,
  ConversationListResponse,
  ConversationSchema,
  MarkReadResponse,
  MessageSchema,
  SendReplyResponse,
  UnreadResponse,
  vendorMessagesApi,
} from "../../lib/messaging-api"

export type { ConversationDetailResponse }

const CONVERSATIONS_QUERY_KEY = "vendor_conversations" as const
export const conversationsQueryKeys = queryKeysFactory(CONVERSATIONS_QUERY_KEY)

const UNREAD_QUERY_KEY = "vendor_messaging_unread" as const
export const unreadQueryKeys = queryKeysFactory(UNREAD_QUERY_KEY)

export type ConversationDTO = z.infer<typeof ConversationSchema>

export type MessageDTO = z.infer<typeof MessageSchema>

export type BuyerOrderSummary = z.infer<typeof BuyerOrderSummarySchema>

export const useVendorConversations = (
  query?: Parameters<typeof vendorMessagesApi.query>[0],
  options?: Omit<
    UseQueryOptions<ConversationListResponse, ClientError>,
    "queryKey" | "queryFn"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: conversationsQueryKeys.list(query),
    queryFn: async () => vendorMessagesApi.query(query ?? {}),
    ...options,
  })

  return { ...data, ...rest }
}

export const useVendorConversation = (
  id: string,
  query?: { limit?: number },
) => {
  const limit = query?.limit ?? 20

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, ...rest } =
    useInfiniteQuery<
      ConversationDetailResponse,
      ClientError,
      InfiniteData<ConversationDetailResponse, string | undefined>,
      QueryKey,
      string | undefined
    >({
      queryKey: conversationsQueryKeys.detail(id, { limit }),
      queryFn: async ({ pageParam }) =>
        vendorMessagesApi.$id.query({
          $id: id,
          limit,
          ...(pageParam ? { cursor: pageParam } : {}),
        }),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    })

  const conversation = data?.pages[0]?.conversation
  const buyer_orders = data?.pages[0]?.buyer_orders
  const messages = data?.pages.flatMap((p) => p.messages) ?? []

  return {
    conversation,
    messages,
    buyer_orders,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    ...rest,
  }
}

export const useVendorUnread = (
  options?: Omit<
    UseQueryOptions<UnreadResponse, ClientError>,
    "queryKey" | "queryFn"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: unreadQueryKeys.detail("total"),
    queryFn: async () => vendorMessagesApi.unread.query(),
    ...options,
  })

  return { ...data, ...rest }
}

export const useSendVendorReply = (
  conversationId: string,
  options?: UseMutationOptions<SendReplyResponse, ClientError, { body: string }>
) => {
  const queryClient = useQueryClient()
  const { onSuccess, onError, ...restOptions } = options ?? {}

  return useMutation({
    ...restOptions,
    mutationFn: (payload: { body: string }) =>
      vendorMessagesApi.$id.mutate({ $id: conversationId, ...payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: conversationsQueryKeys.detail(conversationId),
      })
      queryClient.invalidateQueries({
        queryKey: conversationsQueryKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: unreadQueryKeys.all,
      })
      onSuccess?.(data, variables, context)
    },
    onError,
  })
}

export const useMarkVendorRead = (
  conversationId: string,
  options?: UseMutationOptions<MarkReadResponse, ClientError, void>
) => {
  const queryClient = useQueryClient()
  const { onSuccess, onError, ...restOptions } = options ?? {}

  return useMutation({
    ...restOptions,
    mutationFn: () =>
      vendorMessagesApi.$id.read.mutate({ $id: conversationId }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: conversationsQueryKeys.detail(conversationId),
      })
      queryClient.invalidateQueries({
        queryKey: conversationsQueryKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: unreadQueryKeys.all,
      })
      onSuccess?.(data, variables, context)
    },
    onError,
  })
}
