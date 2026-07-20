import { useQuery, type UseQueryResult } from "@tanstack/react-query"
import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { client } from "../../lib/client"
import { AdminUserMeSchema, type AdminUserMe } from "../../lib/messenger/schemas"
import { MessengerAdminProvider } from "../../providers/messenger-provider/MessengerAdminProvider"
import { MessengerAdminInbox } from "./components/MessengerAdminInbox"
import { MessagesIcon } from "./components/MessagesIcon"

export const config = {
  label: "domain",
  translationNs: "messages",
  icon: MessagesIcon,
  rank: 90,
}

function useAdminMe(): UseQueryResult<AdminUserMe, Error> {
  return useQuery({
    queryKey: ["admin-me"],
    queryFn: async (): Promise<AdminUserMe> => {
      const raw = await client.admin.users.me.query({})
      const parsed = AdminUserMeSchema.safeParse(raw)
      if (!parsed.success) throw new Error("Unexpected response shape from /admin/users/me")
      return parsed.data
    },
    staleTime: 60_000,
    retry: false,
  })
}

export default function MessagesPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { data, isLoading } = useAdminMe()
  const adminId = data?.user?.id ?? null

  return (
    <div className="flex flex-col overflow-hidden px-6 pt-6 pb-0 h-[calc(100vh-57px)]">
      <Heading className="mb-4 flex-shrink-0">{t("messages.domain")}</Heading>
      <div className="flex-1 min-h-0 overflow-hidden pb-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-ui-fg-muted text-sm">
            <div className="w-6 h-6 border-2 border-ui-border-interactive border-t-transparent rounded-full animate-spin" />
          </div>
        ) : adminId ? (
          <MessengerAdminProvider adminId={adminId}>
            <MessengerAdminInbox adminId={adminId} />
          </MessengerAdminProvider>
        ) : (
          <div className="flex h-full items-center justify-center text-ui-fg-muted text-sm">
            {t("messages.failedToGetUserInfo")}
          </div>
        )}
      </div>
    </div>
  )
}
