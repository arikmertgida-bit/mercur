import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Avatar, StatusBadge, Text } from "@medusajs/ui"
import { DateCell } from "@mercurjs/dashboard-shared"
import { FollowerDTO } from "../../api/followers"

const columnHelper = createColumnHelper<FollowerDTO>()

function buildDisplayName(follower: FollowerDTO): string {
  const fullName = [follower.first_name, follower.last_name]
    .filter((part): part is string => Boolean(part && part.trim().length > 0))
    .join(" ")
  return fullName || follower.email || follower.customer_id
}

function buildAvatarFallback(follower: FollowerDTO): string {
  const name = buildDisplayName(follower)
  return name.charAt(0).toUpperCase()
}

function ratingColor(rating: number): "green" | "orange" | "red" {
  if (rating >= 4) return "green"
  if (rating >= 3) return "orange"
  return "red"
}

export const useFollowerTableColumns = () => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      columnHelper.display({
        id: "customer",
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">{t("fields.customer")}</span>
          </div>
        ),
        cell: ({ row }) => {
          const follower = row.original
          return (
            <div className="flex items-center gap-x-3 overflow-hidden">
              <Avatar
                src={follower.avatar_url ?? undefined}
                fallback={buildAvatarFallback(follower)}
                size="small"
              />
              <Text size="small" leading="compact" className="truncate">
                {buildDisplayName(follower)}
              </Text>
            </div>
          )
        },
      }),
      columnHelper.accessor("email", {
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">{t("fields.email")}</span>
          </div>
        ),
        cell: ({ getValue }) => (
          <Text size="small" leading="compact" className="text-ui-fg-subtle truncate">
            {getValue() || "-"}
          </Text>
        ),
      }),
      columnHelper.accessor("orders_count", {
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">{t("fields.orders")}</span>
          </div>
        ),
        cell: ({ getValue }) => (
          <Text size="small" leading="compact">
            {getValue()}
          </Text>
        ),
      }),
      columnHelper.accessor("reviews_count", {
        id: "reviews",
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">{t("reviews.domain")}</span>
          </div>
        ),
        cell: ({ row }) => {
          const follower = row.original
          if (follower.reviews_count === 0) {
            return (
              <Text size="small" leading="compact" className="text-ui-fg-muted">
                -
              </Text>
            )
          }
          const rating = follower.reviews_average_rating ?? 0
          return (
            <StatusBadge color={ratingColor(rating)}>
              {rating.toFixed(1)} / 5 ({follower.reviews_count})
            </StatusBadge>
          )
        },
      }),
      columnHelper.accessor("followed_at", {
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">{t("followers.columns.followedAt")}</span>
          </div>
        ),
        cell: ({ getValue }) => {
          const date = new Date(getValue())
          return <DateCell date={date} />
        },
      }),
    ],
    [t],
  )
}
