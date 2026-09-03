import { useQuery, UseQueryOptions } from "@tanstack/react-query"
import { queryKeysFactory } from "@mercurjs/dashboard-shared"
import { client } from "../../lib/client"
import { ClientError, InferClientOutput } from "@mercurjs/client"

const DASHBOARD_QUERY_KEY = "vendor_dashboard" as const
export const dashboardQueryKeys = queryKeysFactory(DASHBOARD_QUERY_KEY)

export type VendorDashboardData = InferClientOutput<typeof client.vendor.dashboard.query>

// Orders are the only field on this response that changes fast — a short
// poll keeps the "today/this week/this month" tiles current across a long
// -open dashboard tab without hammering the backend (bounded to one
// seller's orders, a cheap query even at high polling frequency, but 30s
// rather than the 5s used for the followers badge — this endpoint does
// more work per call). Earnings/trend/low-stock inside the same response
// are themselves only refreshed by the backend every 12h, so re-polling
// them this often costs nothing beyond the one shared request.
const ORDERS_REFETCH_INTERVAL_MS = 30_000

export const useVendorDashboard = (
  options?: Omit<
    UseQueryOptions<unknown, ClientError, VendorDashboardData>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: dashboardQueryKeys.detail("summary"),
    queryFn: async () => client.vendor.dashboard.query(),
    refetchInterval: ORDERS_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    ...options,
  })
}
