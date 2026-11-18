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
import { sdk } from "../../lib/client";
import { queryClient } from "../../lib/query-client";
import { queryKeysFactory } from "../../lib/query-key-factory";

const SHIPPING_PROFILE_QUERY_KEY = "shipping_profile" as const;
export const shippingProfileQueryKeys = queryKeysFactory(
  SHIPPING_PROFILE_QUERY_KEY
);

export const useShippingProfile = (
  id: string,
  query?: Omit<
    InferClientInput<typeof sdk.vendor.shippingProfiles.$id.query>,
      "$id"
  >,
  options?: Omit<
    UseQueryOptions<
      InferClientOutput<typeof sdk.vendor.shippingProfiles.$id.query>,
      ClientError,
      InferClientOutput<typeof sdk.vendor.shippingProfiles.$id.query>
    >,
    "queryKey" | "queryFn"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () => sdk.vendor.shippingProfiles.$id.query({ $id: id, ...query }),
    queryKey: shippingProfileQueryKeys.detail(id, query),
    ...options,
  });

  return { ...data, ...rest };
};

export const useShippingProfiles = (
  query?: InferClientInput<typeof sdk.vendor.shippingProfiles.query>,
  options?: Omit<
    UseQueryOptions<
      InferClientOutput<typeof sdk.vendor.shippingProfiles.query>,
      ClientError,
      InferClientOutput<typeof sdk.vendor.shippingProfiles.query>
    >,
    "queryKey" | "queryFn"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () => sdk.vendor.shippingProfiles.query({ ...query }),
    queryKey: shippingProfileQueryKeys.list(query),
    ...options,
  });

  return { ...data, ...rest };
};

export const useCreateShippingProfile = (
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.shippingProfiles.mutate>,
    ClientError,
    InferClientInput<typeof sdk.vendor.shippingProfiles.mutate>
  >
) => {
  return useMutation({
    ...options,
    mutationFn: (payload) => sdk.vendor.shippingProfiles.mutate(payload),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: shippingProfileQueryKeys.lists(),
      });

      options?.onSuccess?.(data, variables, context);
    },
  });
};

export const useDeleteShippingProfile = (
  id: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.shippingProfiles.$id.delete>,
    ClientError,
    void
  >
) => {
  return useMutation({
    ...options,
    mutationFn: () => sdk.vendor.shippingProfiles.$id.delete({ $id: id }),
    onSuccess: async (data, variables, context) => {
      queryClient.removeQueries({
        queryKey: shippingProfileQueryKeys.detail(id),
      });
      await queryClient.invalidateQueries({
        queryKey: shippingProfileQueryKeys.lists(),
      });

      options?.onSuccess?.(data, variables, context);
    },
  });
};
