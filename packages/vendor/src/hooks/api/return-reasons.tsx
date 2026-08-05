import {
  ClientError,
  InferClientInput,
  InferClientOutput,
} from "@mercurjs/client";
import { UseQueryOptions, useQuery } from "@tanstack/react-query";
import { sdk } from "../../lib/client";
import { queryKeysFactory } from "../../lib/query-key-factory";

const RETURN_REASONS_QUERY_KEY = "return_reasons" as const;
export const returnReasonsQueryKeys = queryKeysFactory(RETURN_REASONS_QUERY_KEY);

/**
 * Only lists return reasons an admin has approved (or created directly) —
 * `/vendor/return-reasons` filters out ones still pending/rejected via the
 * "Talep Et" request flow. Sellers submit new ones through
 * `/requests/return-reasons/create`, never mutate this list directly.
 */
export const useReturnReasons = (
  query?: InferClientInput<typeof sdk.vendor.returnReasons.query>,
  options?: UseQueryOptions<
    unknown,
    ClientError,
    InferClientOutput<typeof sdk.vendor.returnReasons.query>
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () => sdk.vendor.returnReasons.query({ ...query }),
    queryKey: returnReasonsQueryKeys.list(query),
    ...options,
  });

  return { ...data, ...rest };
};
