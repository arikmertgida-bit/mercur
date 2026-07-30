import { useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "@medusajs/ui"
import i18next from "i18next"
import { client } from "../client"
import { AdminUserMeSchema } from "./schemas"
import { MessengerAdminProvider, useMessengerAdmin } from "../../providers/messenger-provider/MessengerAdminProvider"

/** While logged out, poll fast so a fresh login is picked up in seconds. */
const FAST_POLL_INTERVAL_MS = 2_000
const FAST_POLL_MAX_ATTEMPTS = 30
/** Once resolved, fall back to an infrequent background re-check. */
const IDLE_POLL_INTERVAL_MS = 60_000

/**
 * Routes reachable with zero session cookie — polling `/admin/users/me` here
 * can never succeed and only spams the console with 401s. Mirrors vendor's
 * identical `UNAUTHENTICATED_ROUTES` guard in `MessengerVendorBootstrap.tsx`.
 */
const UNAUTHENTICATED_ROUTES = ["/login", "/reset-password", "/invite"]

function isOnUnauthenticatedRoute(): boolean {
  return UNAUTHENTICATED_ROUTES.includes(window.location.pathname)
}

/**
 * Resolves the current admin session's user id via cookie-based auth
 * (see lib/client.ts — this app uses session cookies, not a bearer token).
 * Re-checks on window focus, fast (every 2s, capped) while unresolved so a
 * fresh login is picked up without a full page reload, and infrequently
 * once resolved as a background safety net.
 */
function useAdminSessionId(): string | null {
  const [adminId, setAdminId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let fastAttempts = 0

    const startPolling = (intervalMs: number): void => {
      if (pollTimer) clearInterval(pollTimer)
      pollTimer = setInterval(() => {
        void resolveAdminId()
      }, intervalMs)
    }

    const resolveAdminId = async (): Promise<void> => {
      if (isOnUnauthenticatedRoute()) {
        return
      }
      try {
        const raw = await client.admin.users.me.query({})
        const parsed = AdminUserMeSchema.safeParse(raw)
        const resolvedId = parsed.success ? parsed.data.user.id : null
        if (!cancelled) {
          setAdminId(resolvedId)
          if (resolvedId) {
            startPolling(IDLE_POLL_INTERVAL_MS)
          }
        }
      } catch {
        if (!cancelled) setAdminId(null)
      } finally {
        fastAttempts++
        if (fastAttempts >= FAST_POLL_MAX_ATTEMPTS) {
          startPolling(IDLE_POLL_INTERVAL_MS)
        }
      }
    }

    void resolveAdminId()
    window.addEventListener("focus", resolveAdminId)
    startPolling(FAST_POLL_INTERVAL_MS)

    return (): void => {
      cancelled = true
      window.removeEventListener("focus", resolveAdminId)
      if (pollTimer) clearInterval(pollTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return adminId
}

/**
 * Shows an in-app toast for new messages while the admin is anywhere other
 * than the Messages page — native Notification API (used inside
 * MessengerAdminProvider) already covers the "tab not visible" case, this
 * covers "tab visible, different page".
 */
function MessengerGlobalNotifier(): null {
  const { unreadCount, conversations } = useMessengerAdmin()
  const prevCountRef = useRef<number | null>(null)

  useEffect(() => {
    if (prevCountRef.current === null) {
      prevCountRef.current = unreadCount
      return
    }
    const increased = unreadCount > prevCountRef.current
    prevCountRef.current = unreadCount
    if (!increased) return

    const isMessagesRoute = window.location.pathname.endsWith("/messages")
    if (isMessagesRoute) return

    const latestConversation = conversations[0]
    const latestMessage = latestConversation?.messages?.[0]
    const preview =
      latestMessage?.messageType === "IMAGE"
        ? i18next.t("messenger.sentImage")
        : (latestMessage?.content ?? i18next.t("messenger.newMessageBody"))

    toast.info(i18next.t("messenger.newMessage"), { description: preview })
  }, [unreadCount, conversations])

  return null
}

interface MessengerAdminBootstrapProps {
  children: ReactNode
}

/**
 * Wraps the whole admin app so the messenger socket connection and unread
 * count stay live regardless of which page is open — not just on /messages.
 * Mounted once in main.tsx, outside <App/>'s own QueryClientProvider, so
 * this deliberately avoids react-query (would create a second QueryClient).
 */
export function MessengerAdminBootstrap({ children }: MessengerAdminBootstrapProps): React.JSX.Element {
  const adminId = useAdminSessionId()

  return (
    <MessengerAdminProvider adminId={adminId} persistSession>
      <MessengerGlobalNotifier />
      {children}
    </MessengerAdminProvider>
  )
}
