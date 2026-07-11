import {
  ClientError,
  InferClientInput,
  InferClientOutput,
} from "@mercurjs/client";
import { HttpTypes } from "@mercurjs/types";
import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { sdk } from "../../lib/client";
import { queryClient } from "../../lib/query-client";
import { queryKeysFactory } from "../../lib/query-key-factory";

const MEMBERS_QUERY_KEY = "members" as const;
export const membersQueryKeys = {
  ...queryKeysFactory(MEMBERS_QUERY_KEY),
  me: () => [MEMBERS_QUERY_KEY, "me"],
};

// Rides along on every `me` fetch so the panel gets the actor's rights in the
// same request instead of a follow-up one.
const withPermissionsField = (fields: unknown) =>
  [typeof fields === "string" ? fields : undefined, "+permissions"]
    .filter(Boolean)
    .join(",");

// Shared by `useMe` and route loaders so every entry under the `me` key holds
// the same shape, including `permissions`.
export const meQueryOptions = (query?: Record<string, unknown>) => ({
  queryFn: () =>
    sdk.vendor.members.me.query({
      ...query,
      fields: withPermissionsField(query?.fields),
    } as Parameters<typeof sdk.vendor.members.me.query>[0]),
  queryKey: query ? [...membersQueryKeys.me(), query] : membersQueryKeys.me(),
});

export const useMe = (
  query?: Record<string, unknown>,
  options?: UseQueryOptions<
    any,
    ClientError,
    InferClientOutput<typeof sdk.vendor.members.me.query>
  >,
) => {
  const { data, ...rest } = useQuery({
    ...meQueryOptions(query),
    ...options,
  });

  return {
    ...data,
    ...rest,
  };
};

export const useUpdateMe = (
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.members.me.mutate>,
    ClientError,
    InferClientInput<typeof sdk.vendor.members.me.mutate>
  >,
) => {
  return useMutation({
    mutationFn: (payload) => sdk.vendor.members.me.mutate(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: membersQueryKeys.me() });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useSellerMembers = (
  sellerId: string,
  query?: Omit<
    InferClientInput<typeof sdk.vendor.sellers.$id.members.query>,
    "$id"
  >,
  // `InferClientOutput` resolves to `unknown` for this route due to a
  // pre-existing dual-package hazard (see README §14) splitting the SDK's
  // type resolution — use the real backend response shape directly instead.
  options?: UseQueryOptions<
    unknown,
    ClientError,
    HttpTypes.VendorSellerMemberListResponse
  >,
) => {
  const { data, ...rest } = useQuery({
    queryFn: () =>
      sdk.vendor.sellers.$id.members.query({ $id: sellerId, ...query }),
    queryKey: membersQueryKeys.list({ sellerId, ...query }),
    ...options,
  });

  return {
    ...data,
    ...rest,
  };
};

type MeResponse = InferClientOutput<typeof sdk.vendor.members.me.query>

export const useMember = (id: string) => {
  const meResult = useMe() as MeResponse
  const sellerId = meResult.seller_member?.seller_id ?? ""

  const membersResult = useSellerMembers(
    sellerId,
    {},
    { enabled: !!sellerId && !!id }
  ) as HttpTypes.VendorSellerMemberListResponse

  const sellerMember = (membersResult.seller_members ?? []).find(
    (m) => m.member_id === id
  )
  const user = sellerMember?.member

  return { user }
}

export const useUpdateMemberRole = (
  sellerId: string,
  memberId: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.sellers.$id.members.$memberId.mutate>,
    ClientError,
    { role_id: string }
  >,
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.vendor.sellers.$id.members.$memberId.mutate({
        $id: sellerId,
        $memberId: memberId,
        ...payload,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: membersQueryKeys.lists(),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useRemoveSellerMember = (
  sellerId: string,
  memberId: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.sellers.$id.members.$memberId.delete>,
    ClientError,
    void
  >,
) => {
  return useMutation({
    mutationFn: () =>
      sdk.vendor.sellers.$id.members.$memberId.delete({
        $id: sellerId,
        $memberId: memberId,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: membersQueryKeys.lists(),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
