import { useQuery, UseQueryOptions } from "@tanstack/react-query"
import { queryKeysFactory } from "@mercurjs/dashboard-shared"
import { client } from "../../lib/client"
import { ClientError, InferClientInput, InferClientOutput } from "@mercurjs/client"

const FOLLOWERS_QUERY_KEY = "vendor_followers" as const
export const followersQueryKeys = queryKeysFactory(FOLLOWERS_QUERY_KEY)

export type FollowerDTO = InferClientOutput<
  typeof client.vendor.followers.query
>["followers"][number]

export const useFollowers = (
  query?: InferClientInput<typeof client.vendor.followers.query>,
  options?: Omit<
    UseQueryOptions<
      unknown,
      ClientError,
      InferClientOutput<typeof client.vendor.followers.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: followersQueryKeys.list(query),
    queryFn: async () =>
      client.vendor.followers.query({
        ...query,
      }),
    ...options,
  })

  return { ...data, ...rest }
}
