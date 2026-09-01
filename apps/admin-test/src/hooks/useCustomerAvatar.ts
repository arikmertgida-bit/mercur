import { useEffect, useState } from "react"
import { z } from "zod"

import { client } from "../lib/client"

interface CustomerAvatarInfo {
  avatarUrl: string | null
}

const CustomerMetadataSchema = z.object({
  avatar_url: z.string().nullable().optional(),
})

const avatarCache = new Map<string, CustomerAvatarInfo>()
const inFlight = new Map<string, Promise<CustomerAvatarInfo>>()

const EMPTY: CustomerAvatarInfo = { avatarUrl: null }

function fetchCustomerAvatar(customerId: string): Promise<CustomerAvatarInfo> {
  const cached = avatarCache.get(customerId)
  if (cached) return Promise.resolve(cached)

  const pending = inFlight.get(customerId)
  if (pending) return pending

  // Deliberately queries the list route (filtered to this one id) instead
  // of `.customers.$id.query(...)` — this project's own DELETE override at
  // `apps/api/src/api/admin/customers/[id]/route.ts` makes the codegen'd
  // type for that detail route lose Medusa core's GET signature, even
  // though the runtime endpoint is untouched and still works. The list
  // route has no local override, so it keeps its real, fully-typed GET.
  const promise = client.admin.customers
    .query({ id: customerId })
    .then((raw): CustomerAvatarInfo => {
      const parsed = CustomerMetadataSchema.safeParse(raw.customers?.[0]?.metadata)
      if (!parsed.success) return EMPTY
      const result: CustomerAvatarInfo = { avatarUrl: parsed.data.avatar_url ?? null }
      avatarCache.set(customerId, result)
      return result
    })
    .catch((): CustomerAvatarInfo => {
      avatarCache.set(customerId, EMPTY)
      return EMPTY
    })
    .finally((): void => {
      inFlight.delete(customerId)
    })

  inFlight.set(customerId, promise)
  return promise
}

export function useCustomerAvatar(customerId: string | undefined): CustomerAvatarInfo {
  const [info, setInfo] = useState<CustomerAvatarInfo>(() => {
    if (customerId && avatarCache.has(customerId)) {
      return avatarCache.get(customerId) ?? EMPTY
    }
    return EMPTY
  })

  useEffect((): void => {
    if (!customerId || customerId.trim() === "") return
    if (!customerId.startsWith("cus_")) return

    const cached = avatarCache.get(customerId)
    if (cached) {
      setInfo(cached)
      return
    }

    fetchCustomerAvatar(customerId)
      .then(setInfo)
      .catch((): void => {
        setInfo(EMPTY)
      })
  }, [customerId])

  return info
}
