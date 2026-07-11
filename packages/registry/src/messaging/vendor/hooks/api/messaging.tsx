import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query"
import { queryKeysFactory } from "@mercurjs/dashboard-shared"
import { ClientError } from "@mercurjs/client"
import { vendorMessagesApi } from "../../lib/messaging-api"

const CONVERSATIONS_QUERY_KEY = "vendor_conversations" as const
export const conversationsQueryKeys = queryKeysFactory(CONVERSATIONS_QUERY_KEY)

const UNREAD_QUERY_KEY = "vendor_messaging_unread" as const
export const unreadQueryKeys = queryKeysFactory(UNREAD_QUERY_KEY)

export type ConversationDTO = {
  id: string
  seller_id: string
  buyer_id: string
  buyer_first_name?: string | null
  last_message_preview: string | null
  last_message_sender_type: "customer" | "seller" | null
  last_message_at: string | null
  unread_count_seller: number
  created_at: string
  updated_at: string
  is_buyer_blocked?: boolean
}

export type MessageDTO = {
  id: string
  sender_type: "customer" | "seller"
  body: string
  context_type: "product" | "order" | null
  context_id: string | null
  context_label: string | null
  read_at: string | null
  created_at: string
}

export type BuyerOrderSummary = {
  id: string
  display_id: number | string
  status: string
  total: number
  currency_code: string
  created_at: string
}

type ConversationListResponse = {
  conversations: ConversationDTO[]
  next_cursor: string | null
}

export type ConversationDetailResponse = {
  conversation: ConversationDTO
  messages: MessageDTO[]
  next_cursor: string | null
  buyer_orders: BuyerOrderSummary[]
}

type UnreadResponse = {
  unread_count: number
}

export const useVendorConversations = (
  query?: { cursor?: string; limit?: number },
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
    useInfiniteQuery<ConversationDetailResponse, ClientError>({
      queryKey: conversationsQueryKeys.detail(id, { limit }),
      queryFn: async ({ pageParam }) =>
        vendorMessagesApi.$id.query({
          $id: id,
          limit,
          ...(pageParam ? { cursor: pageParam } : {}),
        }),
      initialPageParam: undefined as string | undefined,
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
  options?: UseMutationOptions<{ message: MessageDTO }, ClientError, { body: string }>
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
  options?: UseMutationOptions<{ success: boolean }, ClientError, void>
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
