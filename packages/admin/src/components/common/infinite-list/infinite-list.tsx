import { QueryKey, useInfiniteQuery } from "@tanstack/react-query"
import { ReactNode, useEffect, useMemo, useRef } from "react"
import { toast } from "@medusajs/ui"
import { Spinner } from "@medusajs/icons"

type PageInfo = { count: number; offset: number; limit: number }

type InfiniteListProps<
  TKey extends string,
  TEntity,
  TResponse extends PageInfo & Record<TKey, TEntity[]>,
> = {
  queryKey: QueryKey
  queryFn: (params: { limit: number; offset: number }) => Promise<TResponse>
  queryOptions?: { enabled?: boolean }
  renderItem: (item: TEntity) => ReactNode
  renderEmpty: () => ReactNode
  /** The response field holding the page's entities. */
  responseKey: TKey
  pageSize?: number
}

export const InfiniteList = <
  TKey extends string,
  TEntity extends { id: string },
  TResponse extends PageInfo & Record<TKey, TEntity[]>,
>({
  queryKey,
  queryFn,
  queryOptions,
  renderItem,
  renderEmpty,
  responseKey,
  pageSize = 20,
}: InfiniteListProps<TKey, TEntity, TResponse>) => {
  const {
    data,
    error,
    fetchNextPage,
    fetchPreviousPage,
    hasPreviousPage,
    hasNextPage,
    isFetching,
    isPending,
  } = useInfiniteQuery({
    queryKey: queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      return await queryFn({
        limit: pageSize,
        offset: pageParam,
      })
    },
    initialPageParam: 0,
    maxPages: 5,
    getNextPageParam: (lastPage) => {
      const moreItemsExist = lastPage.count > lastPage.offset + lastPage.limit
      return moreItemsExist ? lastPage.offset + lastPage.limit : undefined
    },
    getPreviousPageParam: (firstPage) => {
      const moreItemsExist = firstPage.offset !== 0
      return moreItemsExist
        ? Math.max(firstPage.offset - firstPage.limit, 0)
        : undefined
    },
    ...queryOptions,
  })

  const items = useMemo(() => {
    return data?.pages.flatMap((p): TEntity[] => p[responseKey]) ?? []
  }, [data, responseKey])

  const parentRef = useRef<HTMLDivElement>(null)
  const startObserver = useRef<IntersectionObserver>()
  const endObserver = useRef<IntersectionObserver>()
  const fetchNextPageRef = useRef(fetchNextPage)
  const fetchPreviousPageRef = useRef(fetchPreviousPage)

  useEffect(() => {
    fetchNextPageRef.current = fetchNextPage
    fetchPreviousPageRef.current = fetchPreviousPage
  }, [fetchNextPage, fetchPreviousPage])

  useEffect(() => {
    if (isPending) {
      return
    }

    // Define the new observers after we stop fetching
    if (!isFetching) {
      // Define the new observers after paginating
      startObserver.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasPreviousPage) {
            startObserver.current?.disconnect()
            fetchPreviousPageRef.current()
          }
        },
        {
          threshold: 0.5,
        }
      )

      endObserver.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage) {
            endObserver.current?.disconnect()
            fetchNextPageRef.current()
          }
        },
        {
          threshold: 0.5,
        }
      )

      // Register the new observers to observe the new first and last children
      const firstItem = parentRef.current?.firstElementChild
      const lastItem = parentRef.current?.lastElementChild

      if (firstItem) {
        startObserver.current?.observe(firstItem)
      }
      if (lastItem) {
        endObserver.current?.observe(lastItem)
      }
    }

    // Clear the old observers
    return () => {
      startObserver.current?.disconnect()
      endObserver.current?.disconnect()
    }
  }, [
    hasNextPage,
    hasPreviousPage,
    isFetching,
    isPending,
  ])

  useEffect(() => {
    if (error) {
      toast.error(error.message)
    }
  }, [error])

  if (isPending) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <Spinner className="animate-spin" />
      </div>
    )
  }

  return (
    <div ref={parentRef} className="h-full">
      {items?.length
        ? items.map((item) => <div key={item.id}>{renderItem(item)}</div>)
        : renderEmpty()}

      {isFetching && (
        <div className="flex flex-col items-center justify-center py-4">
          <Spinner className="animate-spin" />
        </div>
      )}
    </div>
  )
}
