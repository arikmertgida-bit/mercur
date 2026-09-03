import { useTranslation } from "react-i18next"
import { CalendarMini, ChartBar, Clock, CurrencyDollar } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { StatCard } from "./StatCard"
import { VendorDashboardData } from "../../hooks/api/dashboard"

const formatCurrency = (amount: number, currencyCode: string, locale: string): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return amount.toLocaleString(locale)
  }
}

export const OrderSummarySection = ({
  data,
  isLoading,
}: {
  data: VendorDashboardData | undefined
  isLoading: boolean
}) => {
  const { t, i18n } = useTranslation()

  const earningsToday = data?.earnings.today
  const currencyCode = data?.earnings.currency_code ?? "try"

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
      <div className="grid grid-cols-1 gap-4 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <StatCard
          icon={<CurrencyDollar />}
          label={t("dashboard.orders.earningsToday")}
          value={
            earningsToday
              ? formatCurrency(earningsToday.net_earnings, currencyCode, i18n.language)
              : formatCurrency(0, currencyCode, i18n.language)
          }
          isLoading={isLoading}
        />
      </div>
    </Container>
  )
}
