import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { client } from "../../lib/client"
import { SellerMeSchema } from "../../lib/messenger/schemas"
import { kayiEventManager } from "../../lib/messenger/KayiEventManager"
import { MessengerProvider } from "../../providers/messenger-provider/MessengerProvider"
import { MessengerVendorInbox } from "./components/MessengerVendorInbox"
import { MessagesIcon } from "./components/MessagesIcon"

export const config = {
  label: "Messages",
  icon: MessagesIcon,
  rank: 90,
}

function MessagesContent() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ["vendor-seller-me-messages-page"],
    queryFn: async () => {
      const raw = await client.vendor.sellers.me.query()
      return SellerMeSchema.parse(raw)
    },
    staleTime: 60_000,
    retry: false,
  })

  useEffect(() => {
    kayiEventManager.emitMessagesVisited()
  }, [])

  const sellerId = data?.seller?.id ?? null
  const sellerName = data?.seller?.name ?? undefined
  const sellerLogo = data?.seller?.logo ?? null

  return (
    <div className="flex flex-col overflow-hidden px-6 pt-6 pb-0 h-[calc(100vh-57px)]">
      <Heading className="mb-4 flex-shrink-0">{t("messages.domain")}</Heading>
      <div className="flex-1 min-h-0 overflow-hidden pb-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="w-6 h-6 border-2 border-ui-border-interactive border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sellerId ? (
          <MessengerProvider sellerId={sellerId} sellerName={sellerName}>
            <MessengerVendorInbox sellerId={sellerId} sellerName={sellerName} sellerLogo={sellerLogo} />
          </MessengerProvider>
        ) : (
          <div className="flex h-full items-center justify-center text-ui-fg-muted text-sm">
            {t("messages.error")}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return <MessagesContent />
}
