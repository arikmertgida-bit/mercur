import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Container, Heading, Text } from "@medusajs/ui"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { VendorDashboardData } from "../../hooks/api/dashboard"

type MetricKey = "orders_count" | "net_earnings"

const lineColor = (key: MetricKey): string =>
  key === "orders_count" ? "#2563eb" : "#16a34a"

const ChartSkeleton = () => (
  <div className="bg-ui-bg-component h-full w-full animate-pulse rounded-lg" />
)

export const AnalyticsSection = ({
  data,
  isLoading,
}: {
  data: VendorDashboardData | undefined
  isLoading: boolean
}) => {
  const { t, i18n } = useTranslation()
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>([
    "orders_count",
    "net_earnings",
  ])

  const trend = data?.earnings.trend ?? []
  const totals = trend.reduce(
    (acc, point) => ({
      orders_count: acc.orders_count + point.orders_count,
      net_earnings: acc.net_earnings + point.net_earnings,
    }),
    { orders_count: 0, net_earnings: 0 }
  )

  const toggleMetric = (key: MetricKey) =>
    setActiveMetrics((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    )

  const computedAt = data?.analytics_computed_at
    ? new Intl.DateTimeFormat(i18n.language, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(data.analytics_computed_at))
    : null

  return (
    <Container className="mt-2 divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("dashboard.analytics.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("dashboard.analytics.subtitle")}
          </Text>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 px-6 py-4 lg:grid-cols-4">
        <div className="relative h-[220px] w-full lg:col-span-3 md:h-[300px]">
          {isLoading ? (
            <ChartSkeleton />
          ) : trend.length === 0 ? (
            <div className="text-ui-fg-muted flex h-full items-center justify-center">
              {t("dashboard.analytics.noData")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <CartesianGrid stroke="#333" vertical={false} />
                <Tooltip
                  formatter={(value: number, key: string) => [
                    value,
                    key === "orders_count"
                      ? t("dashboard.analytics.orders")
                      : t("dashboard.analytics.earnings"),
                  ]}
                />
                {activeMetrics.map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={lineColor(key)}
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:block">
          <button
            type="button"
            className="hover:bg-ui-bg-base-hover transition-fg my-1 flex w-full flex-col items-start rounded-lg border p-4 text-left"
            onClick={() => toggleMetric("orders_count")}
          >
            <Heading level="h3">{t("dashboard.analytics.orders")}</Heading>
            <div className="mt-2 flex items-center gap-2">
              <div
                className="h-8 w-1 rounded"
                style={{
                  backgroundColor: activeMetrics.includes("orders_count")
                    ? lineColor("orders_count")
                    : "var(--border-strong, #a1a1aa)",
                }}
              />
              <Text className="text-ui-fg-subtle">{totals.orders_count}</Text>
            </div>
          </button>
          <button
            type="button"
            className="hover:bg-ui-bg-base-hover transition-fg my-1 flex w-full flex-col items-start rounded-lg border p-4 text-left"
            onClick={() => toggleMetric("net_earnings")}
          >
            <Heading level="h3">{t("dashboard.analytics.earnings")}</Heading>
            <div className="mt-2 flex items-center gap-2">
              <div
                className="h-8 w-1 rounded"
                style={{
                  backgroundColor: activeMetrics.includes("net_earnings")
                    ? lineColor("net_earnings")
                    : "var(--border-strong, #a1a1aa)",
                }}
              />
              <Text className="text-ui-fg-subtle">{totals.net_earnings.toFixed(2)}</Text>
            </div>
          </button>
        </div>
      </div>
      <div className="px-6 py-3">
        <Text size="xsmall" className="text-ui-fg-muted">
          {computedAt
            ? t("dashboard.analytics.updatedAt", { date: computedAt })
            : t("dashboard.analytics.updatePending")}
          {" — "}
          {t("dashboard.analytics.updateNotice")}
        </Text>
      </div>
    </Container>
  )
}
