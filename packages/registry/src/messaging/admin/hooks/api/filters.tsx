import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query"
import {
  BlockedListResponse,
  BlockedMessageSchema,
  FilterListResponse,
  FilterRuleDeleteResponse,
  FilterRuleResponse,
  FilterRuleSchema,
  adminMessagesApi,
} from "../../lib/messaging-api"
import { ClientError } from "@mercurjs/client"
import { z } from "zod"

const FILTERS_KEY = "admin_messaging_filters" as const
const BLOCKED_KEY = "admin_messaging_blocked" as const

export type FilterRuleDTO = z.infer<typeof FilterRuleSchema>

export type BlockedMessageDTO = z.infer<typeof BlockedMessageSchema>

type CreateFilterPayload = Parameters<typeof adminMessagesApi.filters.mutate>[0]

type UpdateFilterPayload = Omit<
  Parameters<typeof adminMessagesApi.filters.$id.mutate>[0],
  "$id"
>

type BlockedListQuery = Parameters<typeof adminMessagesApi.blocked.query>[0]

export const useAdminFilters = (
  options?: Omit<UseQueryOptions<FilterListResponse, ClientError>, "queryKey" | "queryFn">
) => {
  const { data, ...rest } = useQuery({
    queryKey: [FILTERS_KEY],
    queryFn: async () => adminMessagesApi.filters.query(),
    ...options,
  })

  return { ...data, ...rest }
}

export const useCreateFilter = (
  options?: UseMutationOptions<
    FilterRuleResponse,
    ClientError,
    CreateFilterPayload
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => adminMessagesApi.filters.mutate(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [FILTERS_KEY] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateFilter = (
  id: string,
  options?: UseMutationOptions<
    FilterRuleResponse,
    ClientError,
    UpdateFilterPayload
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) =>
      adminMessagesApi.filters.$id.mutate({ $id: id, ...payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [FILTERS_KEY] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDeleteFilter = (
  options?: UseMutationOptions<FilterRuleDeleteResponse, ClientError, string>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminMessagesApi.filters.$id.delete({ $id: id }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [FILTERS_KEY] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useAdminBlockedMessages = (
  query?: BlockedListQuery,
  options?: Omit<UseQueryOptions<BlockedListResponse, ClientError>, "queryKey" | "queryFn">
) => {
  const { data, ...rest } = useQuery({
    queryKey: [BLOCKED_KEY, query],
    queryFn: async () => adminMessagesApi.blocked.query(query ?? {}),
    ...options,
  })

  return { ...data, ...rest }
}
