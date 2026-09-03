import { useTranslation } from "react-i18next"
import i18n from "i18next"
import { ChartBar } from "@medusajs/icons"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { useVendorDashboard } from "../../hooks/api/dashboard"
import { OrderSummarySection } from "../_dashboard/OrderSummarySection"
import { AnalyticsSection } from "../_dashboard/AnalyticsSection"
import { LowStockSection } from "../_dashboard/LowStockSection"
import { QuickAccessSection } from "../_dashboard/QuickAccessSection"

/**
 * A negative `rank` is the shared main-layout's signal (see
 * packages/vendor/src/components/layout/main-layout) to pin this custom nav
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
 * Vendor "Gösterge Paneli" — the seller-scoped home dashboard.
 *
 * Lives at its own `/dashboard` path (see `../page.tsx` for the root "/"
 * redirect stub) rather than overriding packages/vendor's root route
 * directly — a root-path custom page has no path segments of its own, so it
 * never shows a slug in the URL bar the way every other nav item
 * (`/orders`, `/products`, ...) does. Entirely backed by Kayı-only
 * infrastructure (apps/api/src/modules/seller-analytics + apps/api/src/jobs/
 * compute-seller-analytics.ts), which is why it lives in apps/vendor rather
 * than packages/vendor — see apps/vendor/CLAUDE.md.
 */
const VendorDashboardPage = () => {
  const { t } = useTranslation()
  const { data, isPending, isError, error } = useVendorDashboard()

  if (isError) {
    throw error
  }

  return (
    <SingleColumnPage>
      <div className="sr-only">
        <h1>{t("dashboard.pageTitle")}</h1>
      </div>
      <OrderSummarySection data={data} isLoading={isPending} />
      <AnalyticsSection data={data} isLoading={isPending} />
      <LowStockSection data={data} isLoading={isPending} />
      <QuickAccessSection />
    </SingleColumnPage>
  )
}

export default VendorDashboardPage
