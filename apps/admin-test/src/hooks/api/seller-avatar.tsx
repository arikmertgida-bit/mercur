import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'

declare const __BACKEND_URL__: string

interface SellerAvatarResponse {
  avatar_url: string | null
}

const SELLER_AVATAR_QUERY_KEY = 'admin-seller-avatar' as const

export const useAdminSellerAvatar = (
  sellerId: string | undefined
): UseQueryResult<SellerAvatarResponse, Error> => {
  return useQuery({
    queryKey: [SELLER_AVATAR_QUERY_KEY, sellerId],
    queryFn: async (): Promise<SellerAvatarResponse> => {
      if (!sellerId || !sellerId.startsWith('sel_')) {
        return { avatar_url: null }
      }
      const res = await fetch(`${__BACKEND_URL__}/admin/seller-avatar/${sellerId}`, {
        credentials: "include",
      })
      if (!res.ok) {
        return { avatar_url: null }
      }
      const raw = await res.json() as { avatar_url: string | null }
      return { avatar_url: raw.avatar_url }
    },
    enabled: !!sellerId && sellerId.startsWith('sel_'),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}
