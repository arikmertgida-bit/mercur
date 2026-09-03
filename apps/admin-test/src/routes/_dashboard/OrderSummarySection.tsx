import { useTranslation } from "react-i18next"
import { CalendarMini, ChartBar, Clock } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { StatCard } from "./StatCard"
import { AdminDashboardData } from "../../hooks/api/dashboard"

export const OrderSummarySection = ({
  data,
  isLoading,
}: {
  data: AdminDashboardData | undefined
  isLoading: boolean
}) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("dashboard.orders.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("dashboard.orders.subtitle")}
          </Text>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 px-6 py-4 sm:grid-cols-3">
        <StatCard
          icon={<Clock />}
          label={t("dashboard.orders.today")}
          value={data?.orders.today ?? 0}
          to="/orders"
          isLoading={isLoading}
        />
        <StatCard
          icon={<CalendarMini />}
          label={t("dashboard.orders.thisWeek")}
          value={data?.orders.this_week ?? 0}
          to="/orders"
          isLoading={isLoading}
        />
        <StatCard
          icon={<ChartBar />}
          label={t("dashboard.orders.thisMonth")}
          value={data?.orders.this_month ?? 0}
          to="/orders"
          isLoading={isLoading}
        />
      </div>
    </Container>
  )
}
