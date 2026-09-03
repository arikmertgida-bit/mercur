import { useTranslation } from "react-i18next"
import { ExclamationCircle, Shopping, Tag, Users } from "@medusajs/icons"
import { StatCard } from "./StatCard"
import { AdminDashboardData } from "../../hooks/api/dashboard"

export const TotalsSection = ({
  data,
  isLoading,
}: {
  data: AdminDashboardData | undefined
  isLoading: boolean
}) => {
  const { t } = useTranslation()

  return (
    <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={<Tag />}
        label={t("dashboard.totals.products")}
        value={data?.totals.total_products ?? 0}
        to="/products"
        isLoading={isLoading}
      />
      <StatCard
        icon={<Shopping />}
        label={t("dashboard.totals.sellers")}
        value={data?.totals.total_sellers ?? 0}
        to="/sellers"
        isLoading={isLoading}
      />
      <StatCard
        icon={<Users />}
        label={t("dashboard.totals.customers")}
        value={data?.totals.total_customers ?? 0}
        to="/customers"
        isLoading={isLoading}
      />
      <StatCard
        icon={<ExclamationCircle />}
        label={t("dashboard.totals.lowStock")}
        value={data?.low_stock_count ?? 0}
        to="/inventory"
        isLoading={isLoading}
      />
    </div>
  )
}
