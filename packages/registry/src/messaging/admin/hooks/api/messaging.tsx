import {
  InfiniteData,
  QueryKey,
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query"
import { ClientError } from "@mercurjs/client"
import { z } from "zod"
import {
  AdminConversationDetailResponse,
  AdminConversationListResponse,
  AdminConversationSchema,
  AdminMessageSchema,
  adminMessagesApi,
} from "../../lib/messaging-api"

export type { AdminConversationDetailResponse }

const ADMIN_CONVERSATIONS_KEY = "admin_conversations" as const
const ADMIN_CONVERSATION_KEY = "admin_conversation" as const

export type AdminConversationDTO = z.infer<typeof AdminConversationSchema>

export type AdminMessageDTO = z.infer<typeof AdminMessageSchema>

type SearchParams = Parameters<typeof adminMessagesApi.query>[0]

export const useAdminConversations = (
  query?: SearchParams,
  options?: Omit<UseQueryOptions<AdminConversationListResponse, ClientError>, "queryKey" | "queryFn">
) => {
  const { data, ...rest } = useQuery({
    queryKey: [ADMIN_CONVERSATIONS_KEY, query],
    queryFn: async () => adminMessagesApi.query(query ?? {}),
    ...options,
  })

  return { ...data, ...rest }
}

export const useAdminConversation = (
  id: string,
  query?: { limit?: number },
) => {
  const limit = query?.limit ?? 20

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, ...rest } =
    useInfiniteQuery<
      AdminConversationDetailResponse,
      ClientError,
      InfiniteData<AdminConversationDetailResponse, string | undefined>,
      QueryKey,
      string | undefined
    >({
      queryKey: [ADMIN_CONVERSATION_KEY, id, { limit }],
      queryFn: async ({ pageParam }) =>
        adminMessagesApi.$id.query({
          $id: id,
          limit,
          ...(pageParam ? { cursor: pageParam } : {}),
        }),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    })

  const conversation = data?.pages[0]?.conversation
  const messages = data?.pages.flatMap((p) => p.messages) ?? []

  return {
    conversation,
    messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    ...rest,
  }
}

export const useBlockCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { customer_id: string; reason?: string }) =>
      adminMessagesApi.chatBlocks.mutate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_CONVERSATIONS_KEY] })
      queryClient.invalidateQueries({ queryKey: [ADMIN_CONVERSATION_KEY] })
    },
  })
}

export const useUnblockCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (customerId: string) =>
      adminMessagesApi.chatBlocks.$customerId.delete({ $customerId: customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_CONVERSATIONS_KEY] })
      queryClient.invalidateQueries({ queryKey: [ADMIN_CONVERSATION_KEY] })
    },
  })
}
