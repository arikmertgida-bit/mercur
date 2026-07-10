import { useEffect, useState } from "react"
import { fetchQuery } from "../lib/fetchQuery"

interface CustomerAvatarInfo {
  avatarUrl: string | null
}

interface CustomerAvatarResponse {
  avatar_url: string | null
}

/**
 * Module-level cache — persists across component mounts/unmounts within the session.
 * Prevents duplicate API calls when multiple thread items request the same customer.
 */
const avatarCache = new Map<string, CustomerAvatarInfo>()
const inFlight = new Map<string, Promise<CustomerAvatarInfo>>()

const EMPTY: CustomerAvatarInfo = { avatarUrl: null }

function fetchCustomerAvatar(customerId: string): Promise<CustomerAvatarInfo> {
  const cached = avatarCache.get(customerId)
  if (cached) return Promise.resolve(cached)

  const pending = inFlight.get(customerId)
  if (pending) return pending

  const promise = fetchQuery<CustomerAvatarResponse>(`/vendor/customer-avatar/${customerId}`, {
    method: "GET",
  })
    .then(({ avatar_url }) => {
      const result: CustomerAvatarInfo = { avatarUrl: avatar_url ?? null }
      avatarCache.set(customerId, result)
      return result
    })
    .catch(() => {
      avatarCache.set(customerId, EMPTY)
      return EMPTY
    })
    .finally(() => {
      inFlight.delete(customerId)
    })

  inFlight.set(customerId, promise)
  return promise
}

/**
 * Fetches a customer's avatar URL by their customer ID (cus_...).
 * Returns immediately from cache if available; otherwise fetches once and caches.
 */
export function useCustomerAvatar(customerId: string | undefined): CustomerAvatarInfo {
  const [info, setInfo] = useState<CustomerAvatarInfo>(() => {
    if (customerId && avatarCache.has(customerId)) {
      return avatarCache.get(customerId) ?? EMPTY
    }
    return EMPTY
  })

  useEffect(() => {
    if (!customerId || customerId.trim() === "") return
    if (!customerId.startsWith("cus_")) return

    const cached = avatarCache.get(customerId)
    if (cached) {
      setInfo(cached)
      return
    }

    fetchCustomerAvatar(customerId)
      .then(setInfo)
      .catch(() => {
        setInfo(EMPTY)
      })
  }, [customerId])

  return info
}
