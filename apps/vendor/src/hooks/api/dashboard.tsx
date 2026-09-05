import { useEffect } from "react"
import { useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query"
import { queryKeysFactory } from "@mercurjs/dashboard-shared"
import { client } from "../../lib/client"
import { ClientError, InferClientOutput } from "@mercurjs/client"
import { kayiEventManager } from "../../lib/messenger/KayiEventManager"
import { MESSENGER_SOCKET_EVENTS } from "../../lib/messenger/socket-events"

const DASHBOARD_QUERY_KEY = "vendor_dashboard" as const
export const dashboardQueryKeys = queryKeysFactory(DASHBOARD_QUERY_KEY)

export type VendorDashboardData = InferClientOutput<typeof client.vendor.dashboard.query>

// Orders (and, as of the live-push below, low-stock too) are what actually
// change fast — this poll is now a resilience fallback for a missed/offline
// socket push (see the effect below), not the primary update path. Bounded
// to one seller's orders, a cheap query even at this frequency. Earnings/
// trend inside the same response are only refreshed by the backend every
// 12h, so re-polling them this often costs nothing beyond the one shared
// request.
const ORDERS_REFETCH_INTERVAL_MS = 30_000

export const useVendorDashboard = (
  options?: Omit<
    UseQueryOptions<unknown, ClientError, VendorDashboardData>,
    "queryKey" | "queryFn"
  >,
) => {
  const queryClient = useQueryClient()

  // Live push: apps/api's inventory-level-changed-low-stock subscriber fires
  // this the instant a seller's stock changes anywhere (their own /inventory
  // or /products/:handle/stock edit, an order fulfillment, a return, ...),
  // so the dashboard refetches immediately instead of waiting for the poll
  // above — no F5 needed. See lib/messenger.ts's broadcastDashboardSync.
  useEffect(() => {
    return kayiEventManager.subscribeNotification(
      MESSENGER_SOCKET_EVENTS.dashboardSync,
      () => {
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
      },
    )
  }, [queryClient])

  return useQuery({
    queryKey: dashboardQueryKeys.detail("summary"),
    queryFn: async () => client.vendor.dashboard.query(),
    refetchInterval: ORDERS_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    ...options,
  })
}
