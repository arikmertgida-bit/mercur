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
import { customerGroupsQueryKeys } from "./customer-groups";

const CUSTOMERS_QUERY_KEY = "customers" as const;
export const customersQueryKeys = queryKeysFactory(CUSTOMERS_QUERY_KEY);

export const useCustomer = (
  id: string,
  query?: Omit<InferClientInput<typeof sdk.vendor.customers.$id.query>, "$id">,
  options?: Omit<
    UseQueryOptions<
      InferClientOutput<typeof sdk.vendor.customers.$id.query>,
      ClientError,
      InferClientOutput<typeof sdk.vendor.customers.$id.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: customersQueryKeys.detail(id, query),
    queryFn: async () => sdk.vendor.customers.$id.query({ $id: id, ...query }),
    ...options,
  });

  return { ...data, ...rest };
};

export const useCustomers = (
  query?: InferClientInput<typeof sdk.vendor.customers.query>,
  options?: Omit<
    UseQueryOptions<
      InferClientOutput<typeof sdk.vendor.customers.query>,
      ClientError,
      InferClientOutput<typeof sdk.vendor.customers.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryFn: () => sdk.vendor.customers.query({ ...query }),
    queryKey: customersQueryKeys.list(query),
    ...options,
  });

  return { ...data, ...rest };
};

export const useCreateCustomer = (
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.customers.mutate>,
    ClientError,
    InferClientInput<typeof sdk.vendor.customers.mutate>
  >,
) => {
  return useMutation({
    mutationFn: (payload) => sdk.vendor.customers.mutate(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: customersQueryKeys.lists() });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUpdateCustomer = (
  id: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.customers.$id.mutate>,
    ClientError,
    Omit<InferClientInput<typeof sdk.vendor.customers.$id.mutate>, "$id">
  >,
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.vendor.customers.$id.mutate({ $id: id, ...payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: customersQueryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: customersQueryKeys.detail(id),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useDeleteCustomer = (
  id: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.customers.$id.delete>,
    ClientError,
    void
  >,
) => {
  return useMutation({
    mutationFn: () => sdk.vendor.customers.$id.delete({ $id: id }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: customersQueryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: customersQueryKeys.detail(id),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useBatchCustomerCustomerGroups = (
  id: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.customers.$id.customerGroups.mutate>,
    ClientError,
    Omit<
      InferClientInput<typeof sdk.vendor.customers.$id.customerGroups.mutate>,
      "$id"
    >
  >,
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.vendor.customers.$id.customerGroups.mutate({ $id: id, ...payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: customerGroupsQueryKeys.details(),
      });
      queryClient.invalidateQueries({
        queryKey: customerGroupsQueryKeys.lists(),
      });

      queryClient.invalidateQueries({
        queryKey: customersQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: customersQueryKeys.details(),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
