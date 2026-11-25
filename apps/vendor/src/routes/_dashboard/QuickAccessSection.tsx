import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Badge, Button } from "@medusajs/ui"
import { TriangleRightMini } from "@medusajs/icons"
import { useCan } from "@mercurjs/dashboard-shared"
import { useFollowers } from "../../hooks/api/followers"
import { useUnseenReturnsCount } from "../../hooks/api/returns"
import { useMessengerUnreads } from "../../providers/messenger-provider/messenger-context"

const QuickAccessButton = ({
  to,
  count,
  label,
}: {
  to: string
  count: number
  label: string
}) => (
  <Link to={to}>
    <Button variant="secondary" className="h-full w-full justify-between py-4">
      <div className="flex items-center gap-4">
        <Badge>{count}</Badge>
        {label}
      </div>
      <TriangleRightMini className="text-ui-fg-muted rtl:rotate-180" />
    </Button>
  </Link>
)

// Kayı-specific quick links (unseen returns, follower count, unread
// messages) — not part of the generic seller-analytics dashboard data since
// they come from Kayı-only backend modules (returns, seller-follow,
// messenger), not vanilla Mercur. Each count is the exact same live source
// as its sidebar nav-item badge (ReturnsIcon/FollowersIcon/MessagesIcon in
// packages/vendor's main-layout), so the two never drift apart.
export const QuickAccessSection = () => {
  const { t } = useTranslation()
  const canViewReturns = useCan("orders.returns")
  const canViewFollowers = useCan("followers")
  const canViewMessages = useCan("messages")
  const { data: unseenReturnsCount } = useUnseenReturnsCount({ enabled: canViewReturns })
  const { count: followersCount } = useFollowers({ limit: 1 }, { enabled: canViewFollowers })
  const unreadMessages = useMessengerUnreads()

  return (
    <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {canViewReturns && (
        <QuickAccessButton
          to="/returns"
          count={unseenReturnsCount ?? 0}
          label={t("dashboard.quickAccess.returns")}
        />
      )}
      {canViewFollowers && (
        <QuickAccessButton
          to="/followers"
          count={followersCount ?? 0}
          label={t("dashboard.quickAccess.followers")}
        />
      )}
      {canViewMessages && (
        <QuickAccessButton
          to="/messages"
          count={unreadMessages.length}
          label={t("dashboard.quickAccess.unreadMessages")}
        />
      )}
    </div>
  )
}
