import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'

import { client } from '../../lib/client'

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
      const { seller } = await client.admin.sellers.$id.query({
        $id: sellerId,
      })
      return { avatar_url: seller.logo ?? null }
    },
    enabled: !!sellerId && sellerId.startsWith('sel_'),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}
