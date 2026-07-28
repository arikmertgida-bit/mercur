import { useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "@medusajs/ui"
import { client } from "../client"
import { SellerMeSchema } from "./schemas"
import { MessengerProvider, useMessenger } from "../../providers/messenger-provider/MessengerProvider"
import { AdminChat } from "../../components/layout/admin-chat/AdminChat"
import { OrdersBadgeBridge } from "./OrdersBadgeBridge"
import { MESSENGER_NOTIFICATION_TYPE } from "./types"

/** While logged out / no store selected, poll fast so a fresh login is picked up in seconds. */
const FAST_POLL_INTERVAL_MS = 2_000
const FAST_POLL_MAX_ATTEMPTS = 30
/** Once resolved, fall back to an infrequent background re-check. */
const IDLE_POLL_INTERVAL_MS = 60_000

/**
 * Routes reachable with zero session cookie — polling `/vendor/sellers/me`
 * here can never succeed and only spams the console with 401s. `/onboarding`
 * is deliberately excluded: it requires a session (post sign-up, pre
 * store-creation), which is exactly the "no store selected" case this hook
 * is meant to poll through.
 */
const UNAUTHENTICATED_ROUTES = ["/login", "/register", "/reset-password"]

/**
 * Being on `/store-select` already *means* "no seller resolved yet" — that's
 * the page's entire purpose, shown right after login before a store is
 * picked. Probing `/vendor/sellers/me` while here is guaranteed to 400 (no
 * `seller_id` in session yet), so skip it outright instead of firing a
 * doomed request every poll tick. `navigate("/", ...)` on successful
 * selection moves off this route immediately, so the very next tick (or the
 * initial call right after) resolves normally with no added latency.
 */
const NO_SELLER_YET_ROUTES = ["/store-select"]

function isOnUnauthenticatedRoute(): boolean {
  return UNAUTHENTICATED_ROUTES.includes(window.location.pathname)
}

function isOnRouteWithoutSelectableSeller(): boolean {
  return NO_SELLER_YET_ROUTES.includes(window.location.pathname)
}

/**
 * Resolves the current vendor session's seller id via cookie-based auth
 * (see lib/client.ts). Re-checks on window focus, fast (every 2s, capped)
 * while unresolved so a fresh login/store-selection is picked up without a
 * full page reload, and infrequently once resolved as a background safety net.
 */
function useSellerSession(): { sellerId: string | null; sellerName: string | undefined } {
  const [sellerId, setSellerId] = useState<string | null>(null)
  const [sellerName, setSellerName] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let fastAttempts = 0

    const startPolling = (intervalMs: number): void => {
      if (pollTimer) clearInterval(pollTimer)
      pollTimer = setInterval(() => {
        void resolveSeller()
      }, intervalMs)
    }

    const resolveSeller = async (): Promise<void> => {
      if (isOnUnauthenticatedRoute() || isOnRouteWithoutSelectableSeller()) {
        return
      }
      try {
        const raw = await client.vendor.sellers.me.query()
        const parsed = SellerMeSchema.safeParse(raw)
        const resolvedId = parsed.success ? (parsed.data.seller?.id ?? null) : null
        const resolvedName = parsed.success ? (parsed.data.seller?.name ?? undefined) : undefined
        if (!cancelled) {
          setSellerId(resolvedId)
          setSellerName(resolvedName)
          if (resolvedId) {
            startPolling(IDLE_POLL_INTERVAL_MS)
          }
        }
      } catch {
        if (!cancelled) {
          setSellerId(null)
          setSellerName(undefined)
        }
      } finally {
        fastAttempts++
        if (fastAttempts >= FAST_POLL_MAX_ATTEMPTS) {
          startPolling(IDLE_POLL_INTERVAL_MS)
        }
      }
    }

    void resolveSeller()
    window.addEventListener("focus", resolveSeller)
    startPolling(FAST_POLL_INTERVAL_MS)

    return (): void => {
      cancelled = true
      window.removeEventListener("focus", resolveSeller)
      if (pollTimer) clearInterval(pollTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { sellerId, sellerName }
}

/**
 * Shows an in-app toast for new messages while the seller is anywhere other
 * than the Messages page — native Notification API (used inside
 * MessengerProvider) already covers the "tab not visible" case, this
 * covers "tab visible, different page".
 */
function MessengerGlobalNotifier(): null {
  const { unreadCount, conversations, isNotificationCategoryEnabled } = useMessenger()
  const prevCountRef = useRef<number | null>(null)

  useEffect(() => {
    if (prevCountRef.current === null) {
      prevCountRef.current = unreadCount
      return
    }
    const increased = unreadCount > prevCountRef.current
    prevCountRef.current = unreadCount
    if (!increased) return

    // "Mesajlar" bildirimi kapatılmışsa yalnızca bu toast bastırılır — sayaç
    // (unreadCount) gerçek mesaj akışından geldiği için burada dokunulmaz.
    if (!isNotificationCategoryEnabled(MESSENGER_NOTIFICATION_TYPE)) return

    const isMessagesRoute = window.location.pathname.endsWith("/messages")
    if (isMessagesRoute) return

    const latestConversation = conversations[0]
    const latestMessage = latestConversation?.messages?.[0]
    const preview =
      latestMessage?.messageType === "IMAGE"
        ? "Görsel gönderdi"
        : (latestMessage?.content ?? "Yeni bir mesajınız var")

    toast.info("Yeni mesaj", { description: preview })
  }, [unreadCount, conversations, isNotificationCategoryEnabled])

  return null
}

interface MessengerVendorBootstrapProps {
  children: ReactNode
}

/**
 * Wraps the whole vendor app so the messenger socket connection and unread
 * count stay live regardless of which page is open, and shows the floating
 * "contact admin" button on every page. Mounted once in main.tsx, outside
 * <App/>'s own QueryClientProvider — deliberately avoids react-query here
 * (would create a second QueryClient).
 */
export function MessengerVendorBootstrap({ children }: MessengerVendorBootstrapProps): React.JSX.Element {
  const { sellerId, sellerName } = useSellerSession()

  return (
    <MessengerProvider sellerId={sellerId} sellerName={sellerName} persistSession>
      <MessengerGlobalNotifier />
      <OrdersBadgeBridge />
      {sellerId && <AdminChat currentUserId={sellerId} />}
      {children}
    </MessengerProvider>
  )
}
