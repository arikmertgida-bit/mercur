import { useEffect, useState } from "react"
import { Drawer, Heading } from "@medusajs/ui"
import { supportChatBridge } from "@mercurjs/dashboard-shared"
import { useTranslation } from "react-i18next"
import { MessengerChat } from "../messenger-chat/MessengerChat"
import { useMessengerAdminUnreads } from "../../../providers/messenger-provider/MessengerProvider"

interface AdminChatProps {
  currentUserId: string
}

/**
 * Admin-support chat drawer. Mounted globally (see MessengerVendorBootstrap),
 * so this reads the current path directly instead of react-router's
 * useLocation (no Router context available outside <App/>). Opened from the
 * vendor sidebar's Support menu item, which lives in packages/vendor — a
 * separate package that cannot import this app-level component directly —
 * via the shared supportChatBridge singleton instead.
 */
export function AdminChat({ currentUserId }: AdminChatProps) {
  const { t } = useTranslation()
  const unreads = useMessengerAdminUnreads()
  const isMessagesRoute = window.location.pathname.endsWith("/messages")
  const unreadCount = isMessagesRoute ? 0 : unreads.length
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    return supportChatBridge.subscribeOpenRequest(() => setIsOpen(true))
  }, [])

  useEffect(() => {
    supportChatBridge.publishUnreadCount(unreadCount)
  }, [unreadCount])

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Content className="w-[420px] max-w-full">
        <Drawer.Header>
          <Drawer.Title asChild>
            <Heading>{t("messenger.adminChatTitle")}</Heading>
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto p-0 flex flex-col">
          <MessengerChat currentUserId={currentUserId} />
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}
