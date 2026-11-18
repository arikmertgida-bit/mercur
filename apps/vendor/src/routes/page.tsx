import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { usePermissions } from "@mercurjs/dashboard-shared"
import type { PermissionKey } from "@mercurjs/dashboard-sdk"

// First page the member may open, in sidebar order.
const LANDING_PAGES: ReadonlyArray<readonly [PermissionKey, string]> = [
  ["dashboard", "/dashboard"],
  ["orders", "/orders"],
  ["products", "/products"],
  ["inventory_items", "/inventory"],
  ["customers", "/customers"],
  ["reviews", "/reviews"],
  ["messages", "/messages"],
  ["payouts", "/payouts"],
]
const FALLBACK_PAGE = "/settings/store"

/**
 * Redirect-only stub, mirroring packages/vendor/src/pages/home — the real
 * dashboard lives at `./dashboard/page.tsx` so it gets a visible URL slug
 * (`/dashboard`) like every other nav item instead of living bare at "/".
 * A member whose role has no dashboard lands on their first allowed page.
 */
const VendorHomeRedirect = () => {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const target =
    LANDING_PAGES.find(([key]) => can(key, "view"))?.[1] ?? FALLBACK_PAGE

  useEffect(() => {
    navigate(target, { replace: true })
  }, [navigate, target])

  return <div />
}

export default VendorHomeRedirect
