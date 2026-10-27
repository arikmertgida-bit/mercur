import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";

import { sdk } from "../../lib/client";
import { queryKeysFactory } from "../../lib/query-key-factory";
import type {
  ClientError,
  InferClientInput,
  InferClientOutput,
} from "@mercurjs/client";

const MEMBERS_QUERY_KEY = "members" as const;
export const membersQueryKeys = queryKeysFactory(MEMBERS_QUERY_KEY);

export const useMembers = (
  query?: InferClientInput<typeof sdk.admin.members.query>,
  options?: Omit<
    UseQueryOptions<
      InferClientOutput<typeof sdk.admin.members.query>,
      ClientError,
      InferClientOutput<typeof sdk.admin.members.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryFn: () => sdk.admin.members.query(query),
    queryKey: membersQueryKeys.list(query ?? {}),
    ...options,
  });

  return { ...data, ...rest };
};
