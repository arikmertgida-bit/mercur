import { useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "@medusajs/ui"
import { SellerMeSchema } from "./schemas"
import type { JsonRecord } from "../json-record"
import { MessengerProvider, useMessenger } from "../../providers/messenger-provider/MessengerProvider"
import { AdminChat } from "../../components/layout/admin-chat/AdminChat"

declare const __BACKEND_URL__: string

/** While logged out / no store selected, poll fast so a fresh login is picked up in seconds. */
const FAST_POLL_INTERVAL_MS = 2_000
const FAST_POLL_MAX_ATTEMPTS = 30
/** Once resolved, fall back to an infrequent background re-check. */
const IDLE_POLL_INTERVAL_MS = 60_000

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
      try {
        const res = await fetch(`${__BACKEND_URL__}/vendor/sellers/me`, {
          credentials: "include",
        })
        if (!res.ok) {
          if (!cancelled) {
            setSellerId(null)
            setSellerName(undefined)
          }
          return
        }
        const raw: JsonRecord = await res.json()
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
  const { unreadCount, conversations } = useMessenger()
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
        ? "Görsel gönderdi"
        : (latestMessage?.content ?? "Yeni bir mesajınız var")

    toast.info("Yeni mesaj", { description: preview })
  }, [unreadCount, conversations])

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
      {sellerId && <AdminChat currentUserId={sellerId} />}
      {children}
    </MessengerProvider>
  )
}
