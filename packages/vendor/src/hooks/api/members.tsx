import {
  ClientError,
  InferClientInput,
  InferClientOutput,
} from "@mercurjs/client";
import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { MemberAreaPermissions, PERMISSION_RIGHTS } from "@mercurjs/types/permissions";
import { SellerRole } from "@mercurjs/types/seller";
import { z } from "zod";

import { fetchQuery, sdk } from "../../lib/client";
import { queryClient } from "../../lib/query-client";
import { queryKeysFactory } from "../../lib/query-key-factory";

const MEMBERS_QUERY_KEY = "members" as const;
export const membersQueryKeys = {
  ...queryKeysFactory(MEMBERS_QUERY_KEY),
  me: () => [MEMBERS_QUERY_KEY, "me"],
};

// Rides along on every `me` fetch so the panel gets the actor's rights in the
// same request instead of a follow-up one.
const withPermissionsField = (fields?: string): string =>
  [fields, "+permissions"].filter(Boolean).join(",");

type MeQuery = InferClientInput<typeof sdk.vendor.members.me.query>
type MeResponse = InferClientOutput<typeof sdk.vendor.members.me.query>

// Shared by `useMe` and route loaders so every entry under the `me` key holds
// the same shape, including `permissions`.
export const meQueryOptions = (query?: MeQuery) => ({
  queryFn: () =>
    sdk.vendor.members.me.query({
      ...query,
      fields: withPermissionsField(query?.fields),
    }),
  queryKey: query ? [...membersQueryKeys.me(), query] : membersQueryKeys.me(),
});

export const useMe = (
  query?: MeQuery,
  options?: UseQueryOptions<MeResponse, ClientError, MeResponse>,
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
    ...options,
    mutationFn: (payload) => sdk.vendor.members.me.mutate(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: membersQueryKeys.me() });
      options?.onSuccess?.(data, variables, context);
    },
  });
};

export const useSellerMembers = (
  sellerId: string,
  query?: Omit<
    InferClientInput<typeof sdk.vendor.sellers.$id.members.query>,
    "$id"
  >,
  options?: Omit<
    UseQueryOptions<
      InferClientOutput<typeof sdk.vendor.sellers.$id.members.query>,
      ClientError,
      InferClientOutput<typeof sdk.vendor.sellers.$id.members.query>
    >,
    "queryKey" | "queryFn"
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

export const useMember = (id: string) => {
  const meResult = useMe()
  const sellerId = meResult.seller_member?.seller_id ?? ""

  const membersResult = useSellerMembers(
    sellerId,
    {},
    { enabled: !!sellerId && !!id }
  )

  const sellerMember = (membersResult.seller_members ?? []).find(
    (m) => m.member_id === id
  )
  const user = sellerMember?.member

  return { user }
}

export type UpdateMemberPermissionsPayload = {
  role_id: SellerRole
  /** Omitted or null: the role template applies. */
  permissions?: MemberAreaPermissions | null
}

export const useUpdateMemberRole = (
  sellerId: string,
  memberId: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.sellers.$id.members.$memberId.mutate>,
    ClientError,
    UpdateMemberPermissionsPayload
  >,
) => {
  return useMutation({
    ...options,
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
    ...options,
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
  });
};

const PermissionRightSchema = z.enum(PERMISSION_RIGHTS);

const MemberPermissionAreasSchema = z.object({
  areas: z.array(
    z.object({
      id: z.string(),
      max_right: PermissionRightSchema,
      requires: z.array(
        z.object({
          from: PermissionRightSchema,
          area: z.string(),
          right: PermissionRightSchema,
        }),
      ),
    }),
  ),
  templates: z.record(z.string(), z.record(z.string(), PermissionRightSchema)),
});

export type MemberPermissionAreas = z.infer<typeof MemberPermissionAreasSchema>;
export type MemberPermissionArea = MemberPermissionAreas["areas"][number];

const fetchMemberPermissionAreas = async (): Promise<MemberPermissionAreas> =>
  MemberPermissionAreasSchema.parse(
    await fetchQuery("/vendor/member-permission-areas", { method: "GET" }),
  );

/** The invite checkbox table and the role templates that prefill it. */
export const useMemberPermissionAreas = (
  options?: Omit<
    UseQueryOptions<MemberPermissionAreas, Error, MemberPermissionAreas>,
    "queryKey" | "queryFn"
  >,
) =>
  useQuery({
    queryKey: [MEMBERS_QUERY_KEY, "permission-areas"],
    queryFn: fetchMemberPermissionAreas,
    staleTime: Infinity,
    ...options,
  });
