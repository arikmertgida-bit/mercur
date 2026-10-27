import { ClientError } from "@mercurjs/client"
import {
  QueryKey,
  UseInfiniteQueryOptions,
  InfiniteData,
  useInfiniteQuery,
} from "@tanstack/react-query"

/**
 * Generic hook for infinite queries with pagination support.
 *
 * @template TResponse - The response type that must include count, offset, and limit
 * @template TQuery - The query parameters type (offset and limit will be handled internally)
 * @template TError - The error type (defaults to ClientError)
 *
 * @param config - Configuration object
 * @param config.queryKey - Function or array that generates the query key
 * @param config.queryFn - Function that fetches data with offset and limit
 * @param config.query - Query parameters (offset is ignored, limit is optional)
 * @param config.options - Additional options for useInfiniteQuery
 *
 * @example
 * ```ts
 * const { data, fetchNextPage, hasNextPage } = useInfiniteList({
 *   queryKey: (params) => productVariantQueryKeys.list(params),
 *   queryFn: async (params) => sdk.admin.productVariant.list(params),
 *   query: { status: "published" },
 * })
 * ```
 */
type PagedQuery = { offset?: number; limit?: number }

type PageParams = { offset: number; limit: number }

type PageInfo = { count: number; offset: number; limit: number }

/** The caller's query without its paging params, which the hook drives itself. */
type BaseQuery<TQuery extends PagedQuery> = Partial<Omit<TQuery, keyof PagedQuery>>

const withoutPaging = <TQuery extends PagedQuery>(
  query: TQuery
): Omit<TQuery, keyof PagedQuery> => {
  const { limit: _limit, offset: _offset, ...rest } = query
  return rest
}

export const useInfiniteList = <
  TResponse extends PageInfo,
  TQuery extends PagedQuery = PagedQuery,
  TError = ClientError
>({
  queryKey,
  queryFn,
  query,
  options,
}: {
  queryKey: ((params: BaseQuery<TQuery>) => QueryKey) | QueryKey
  queryFn: (params: BaseQuery<TQuery> & PageParams) => Promise<TResponse>
  query?: TQuery
  options?: Omit<
    UseInfiniteQueryOptions<
      TResponse,
      TError,
      InfiniteData<TResponse, number>,
      TResponse,
      QueryKey,
      number
    >,
    "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
  >
}) => {
  const limit = query?.limit ?? 50
  const baseQuery: BaseQuery<TQuery> = query ? withoutPaging(query) : {}
  const resolvedQueryKey =
    typeof queryKey === "function" ? queryKey(baseQuery) : queryKey
  const infiniteQueryKey =
    resolvedQueryKey[resolvedQueryKey.length - 1] === "__infinite"
      ? resolvedQueryKey
      : [...resolvedQueryKey, "__infinite"]

  return useInfiniteQuery<
    TResponse,
    TError,
    InfiniteData<TResponse, number>,
    QueryKey,
    number
  >({
    // Infinite queries must not share the exact same queryKey as non-infinite queries,
    // since the cached data shape differs (InfiniteData<T> vs T).
    queryKey: infiniteQueryKey,
    queryFn: ({ pageParam = 0 }) => {
      return queryFn({ ...baseQuery, limit, offset: pageParam })
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const moreItemsExist = lastPage.count > lastPage.offset + lastPage.limit
      return moreItemsExist ? lastPage.offset + lastPage.limit : undefined
    },
    ...options,
  })
}
