import { useQuery, UseQueryOptions } from "@tanstack/react-query"
import { queryKeysFactory } from "@mercurjs/dashboard-shared"
import { client } from "../../lib/client"
import { ClientError, InferClientOutput } from "@mercurjs/client"

const DASHBOARD_QUERY_KEY = "admin_dashboard" as const
export const dashboardQueryKeys = queryKeysFactory(DASHBOARD_QUERY_KEY)

export type AdminDashboardData = InferClientOutput<typeof client.admin.dashboard.query>

// Same split as the vendor dashboard hook: only the live order counts
// benefit from polling — earnings/trend/totals/low-stock in the same
// response are refreshed by the backend every 12h regardless.
const ORDERS_REFETCH_INTERVAL_MS = 30_000

export const useAdminDashboard = (
  options?: Omit<
    UseQueryOptions<unknown, ClientError, AdminDashboardData>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: dashboardQueryKeys.detail("summary"),
    queryFn: async () => client.admin.dashboard.query(),
    refetchInterval: ORDERS_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    ...options,
  })
}
