import { useQuery, UseQueryOptions } from "@tanstack/react-query"
import { z } from "zod"
import { queryKeysFactory } from "@mercurjs/dashboard-shared"
import { fetchQuery, HttpFetchError } from "../../lib/fetchQuery"

const RETURNS_QUERY_KEY = "vendor_returns" as const
export const returnsQueryKeys = queryKeysFactory(RETURNS_QUERY_KEY)

const ReturnsUnseenCountResponseSchema = z.object({ count: z.number() })

/**
 * Same `/vendor/returns/unseen-count` endpoint and 30s poll as the sidebar
 * "İadeler" badge (packages/vendor/src/hooks/api/returns.tsx) — reimplemented
 * here with apps/vendor's own fetchQuery since that hook isn't part of
 * `@mercurjs/vendor`'s exported surface, so the dashboard's İadeler card
 * always shows the exact same count as the nav item badge.
 */
export const useUnseenReturnsCount = (
  options?: Omit<
    UseQueryOptions<number, HttpFetchError>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: returnsQueryKeys.detail("unseen-count"),
    queryFn: async () => {
      const raw = await fetchQuery<unknown>("/vendor/returns/unseen-count", {
        method: "GET",
      })
      return ReturnsUnseenCountResponseSchema.parse(raw).count
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    ...options,
  })
}
