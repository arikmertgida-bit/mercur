import { useMutation, useQuery, UseMutationOptions, UseQueryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { fetchQuery } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { queryKeysFactory } from "../../lib/query-key-factory"

/**
 * Category keys for the vendor Notification Preferences toggle. Values must
 * stay in sync with `messenger/src/constants/notification-types.ts` and
 * `apps/vendor/src/lib/messenger/types.ts`.
 */
export const NotificationCategory = {
  ORDER: "order_notification",
  PAYOUT: "payout_notification",
  REQUEST: "request_notification",
  REVIEW: "review_notification",
  FOLLOWER: "follower_notification",
  MESSENGER: "messenger",
} as const

export type NotificationCategoryType =
  (typeof NotificationCategory)[keyof typeof NotificationCategory]

export const ALL_NOTIFICATION_CATEGORIES: NotificationCategoryType[] =
  Object.values(NotificationCategory)

const NOTIFICATION_PREFERENCES_QUERY_KEY = "notification-preferences" as const
export const notificationPreferencesQueryKeys = queryKeysFactory(
  NOTIFICATION_PREFERENCES_QUERY_KEY
)

const NotificationPreferenceEntrySchema = z.object({
  notificationType: z.string(),
  enabled: z.boolean(),
})

const NotificationPreferencesResponseSchema = z.object({
  preferences: z.array(NotificationPreferenceEntrySchema),
})

export type NotificationPreferenceEntry = z.infer<
  typeof NotificationPreferenceEntrySchema
>

/** `apps/api`'s `/vendor/notification-preferences` proxy — see that route for why. */
const NOTIFICATION_PREFERENCES_URL = "/vendor/notification-preferences"

async function fetchNotificationPreferences(): Promise<NotificationPreferenceEntry[]> {
  const raw = await fetchQuery(NOTIFICATION_PREFERENCES_URL, { method: "GET" })
  const parsed = NotificationPreferencesResponseSchema.parse(raw)
  const byType = new Map(
    parsed.preferences.map((entry) => [entry.notificationType, entry.enabled])
  )
  return ALL_NOTIFICATION_CATEGORIES.map((notificationType) => ({
    notificationType,
    enabled: byType.get(notificationType) ?? true,
  }))
}

async function saveNotificationPreferences(
  preferences: NotificationPreferenceEntry[]
): Promise<NotificationPreferenceEntry[]> {
  const raw = await fetchQuery(NOTIFICATION_PREFERENCES_URL, {
    method: "POST",
    body: { preferences },
  })
  return NotificationPreferencesResponseSchema.parse(raw).preferences
}

export const useNotificationPreferences = (
  options?: Omit<
    UseQueryOptions<NotificationPreferenceEntry[], Error>,
    "queryFn" | "queryKey"
  >
) => {
  return useQuery({
    queryKey: notificationPreferencesQueryKeys.list(),
    queryFn: fetchNotificationPreferences,
    ...options,
  })
}

export const useUpdateNotificationPreferences = (
  options?: UseMutationOptions<
    NotificationPreferenceEntry[],
    Error,
    NotificationPreferenceEntry[]
  >
) => {
  return useMutation({
    mutationFn: saveNotificationPreferences,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: notificationPreferencesQueryKeys.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
