import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Star } from "@medusajs/icons"
import { reviewsQueryKeys, useReviewStats } from "../../../hooks/api/reviews"
import { kayiEventManager } from "../../../lib/messenger/KayiEventManager"
import { REVIEW_NOTIFICATION_TYPE } from "../../../lib/messenger/types"

const BADGE_CLASSES =
  "pointer-events-none absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand px-0.5 text-[9px] font-semibold tabular-nums text-white shadow-sm"

function formatSidebarUnreadCount(count: number): string {
  if (count > 9) {
    return "9+"
  }
  return String(count)
}

/**
 * Badge shows how many reviews are still awaiting a seller reply — computed
 * from real review rows (`useReviewStats`, polled + refetched on window
 * focus), not an ephemeral notification-pulse count. It stays correct with
 * no page refresh: a new customer review pushes an instant refetch via the
 * messenger "new review" socket event, and `useUpdateReview` invalidates the
 * same query the moment a seller reply is saved, so the count decrements by
 * exactly one without waiting for the next poll.
 */
export function ReviewsIcon(props: { className?: string }): React.JSX.Element {
  const { className } = props
  const queryClient = useQueryClient()
  const { awaiting_reply_count } = useReviewStats()

  React.useEffect((): (() => void) => {
    return kayiEventManager.subscribeNotification(REVIEW_NOTIFICATION_TYPE, (): void => {
      queryClient.invalidateQueries({ queryKey: reviewsQueryKeys.detail("stats") })
    })
  }, [queryClient])

  const safeCount = awaiting_reply_count ?? 0
  const badgeLabel = formatSidebarUnreadCount(safeCount)

  return (
    <span className="relative inline-flex">
      <Star className={className} />
      {safeCount > 0 && (
        <span className={BADGE_CLASSES} aria-hidden="true">
          {badgeLabel}
        </span>
      )}
    </span>
  )
}
