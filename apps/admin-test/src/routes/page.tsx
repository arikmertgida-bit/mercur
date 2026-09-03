import { useTranslation } from "react-i18next"
import i18n from "i18next"
import { ChartBar } from "@medusajs/icons"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { useAdminDashboard } from "../hooks/api/dashboard"
import { OrderSummarySection } from "./_dashboard/OrderSummarySection"
import { TotalsSection } from "./_dashboard/TotalsSection"
import { AnalyticsSection } from "./_dashboard/AnalyticsSection"

/**
 * A negative `rank` is the shared main-layout's signal (see
 * packages/admin/src/components/layout/main-layout) to pin this custom nav
 * item above the fixed core-route list instead of appending it after, since
 * Orders/Products/etc. are a hardcoded array with no rank of their own.
 *
 * The value must be an inline numeric literal, not a named constant: the
 * `config` object here is never executed — `@mercurjs/dashboard-sdk`'s Vite
 * plugin statically parses this file's AST at build time to generate
 * `virtual:mercur/menu-items` (see packages/dashboard-sdk/src/menu-items.ts,
 * `isNumericLiteral(rank.value)`), so a variable reference resolves to
 * `undefined` there and silently falls back to the default (non-negative)
 * position.
 */
export const config: RouteConfig = {
  label: "domain",
  translationNs: "dashboard",
  icon: ChartBar,
  rank: -1,
}

export const handle = {
  breadcrumb: () => i18n.t("dashboard.domain"),
}

/**
 * Admin "Gösterge Paneli" — the platform-wide home dashboard.
 *
 * Overrides packages/admin's root ("/") Home stub, which just redirects to
 * /orders. Entirely backed by Kayı-only infrastructure
 * (apps/api/src/modules/seller-analytics + apps/api/src/jobs/
 * compute-seller-analytics.ts), so it lives in apps/admin-test rather than
 * packages/admin — see apps/vendor/CLAUDE.md for the same reasoning
 * applied on the vendor side.
 */
const AdminDashboardPage = () => {
  const { t } = useTranslation()
  const { data, isPending, isError, error } = useAdminDashboard()

  if (isError) {
    throw error
  }

  return (
    <SingleColumnPage>
      <div className="sr-only">
        <h1>{t("dashboard.pageTitle")}</h1>
      </div>
      <OrderSummarySection data={data} isLoading={isPending} />
      <TotalsSection data={data} isLoading={isPending} />
      <AnalyticsSection data={data} isLoading={isPending} />
    </SingleColumnPage>
  )
}

export default AdminDashboardPage
