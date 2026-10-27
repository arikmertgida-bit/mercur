import {
  ClientError,
  InferClientInput,
  InferClientOutput,
} from "@mercurjs/client";
import {
  AdminOrderResponse,
  CreateOrderCreditLineDTO,
  HttpTypes,
} from "@medusajs/types";
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { sdk } from "../../lib/client";
import { queryClient } from "../../lib/query-client";
import { queryKeysFactory } from "../../lib/query-key-factory";

const ORDERS_QUERY_KEY = "orders" as const;
const baseOrdersQueryKeys = queryKeysFactory(ORDERS_QUERY_KEY);

// The detail key is nested as the first element, not spread into the tuple.
export const ordersQueryKeys = {
  ...baseOrdersQueryKeys,
  preview: (id: string) => [baseOrdersQueryKeys.detail(id), "preview"] as const,
  changes: (id: string) => [baseOrdersQueryKeys.detail(id), "changes"] as const,
  lineItems: (id: string) =>
    [baseOrdersQueryKeys.detail(id), "lineItems"] as const,
  shippingOptions: (id: string) =>
    [baseOrdersQueryKeys.detail(id), "shippingOptions"] as const,
};

export const useOrder = (
  id: string,
  query?: Omit<
    InferClientInput<typeof sdk.admin.orders.$id.query>,
    "$id"
  >,
  options?: Omit<
    UseQueryOptions<
      AdminOrderResponse,
      ClientError,
      AdminOrderResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => sdk.admin.orders.$id.query({ $id: id, ...query }),
    queryKey: ordersQueryKeys.detail(id, query),
    ...options,
  });

  return { ...data, ...rest };
};

export const useUpdateOrder = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderResponse,
    ClientError,
    HttpTypes.AdminUpdateOrder
  >,
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminUpdateOrder) =>
      sdk.admin.orders.$id.mutate({ $id: id, ...payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.detail(id),
      });

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.changes(id),
      });

      // TODO: enable when needed
      // queryClient.invalidateQueries({
      //   queryKey: ordersQueryKeys.lists(),
      // })

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useOrderPreview = (
  id: string,
  query?: HttpTypes.AdminOrderFilters,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminOrderPreviewResponse,
      ClientError,
      HttpTypes.AdminOrderPreviewResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () =>
      sdk.admin.orders.$id.preview.query({ $id: id, ...query }),
    queryKey: ordersQueryKeys.preview(id),
    ...options,
  });

  return { ...data, ...rest };
};

export const useOrders = (
  query?: InferClientInput<typeof sdk.admin.orders.query>,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminOrderListResponse,
      ClientError,
      HttpTypes.AdminOrderListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => sdk.admin.orders.query({ ...query }),
    queryKey: ordersQueryKeys.list(query),
    ...options,
  });

  return { ...data, ...rest };
};

export const useOrderShippingOptions = (
  id: string,
  query?: HttpTypes.AdminGetOrderShippingOptionList,
  options?: Omit<
    UseQueryOptions<
      { shipping_options: HttpTypes.AdminShippingOption[] },
      ClientError,
      { shipping_options: HttpTypes.AdminShippingOption[] },
      QueryKey
    >,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () =>
      sdk.admin.orders.$id.shippingOptions.query({ $id: id, ...query }),
    queryKey: ordersQueryKeys.shippingOptions(id),
    ...options,
  });

  return { ...data, ...rest };
};

export const useOrderChanges = (
  id: string,
  query?: HttpTypes.AdminOrderChangesFilters,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminOrderChangesResponse,
      ClientError,
      HttpTypes.AdminOrderChangesResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () =>
      sdk.admin.orders.$id.changes.query({ $id: id, ...query }),
    queryKey: ordersQueryKeys.changes(id),
    ...options,
  });

  return { ...data, ...rest };
};

export const useOrderLineItems = (
  id: string,
  query?: HttpTypes.AdminOrderItemsFilters,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminOrderLineItemsListResponse,
      ClientError,
      HttpTypes.AdminOrderLineItemsListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () =>
      sdk.admin.orders.$id.lineItems.query({ $id: id, ...query }),
    queryKey: ordersQueryKeys.lineItems(id),
    ...options,
  });

  return { ...data, ...rest };
};

export const useCancelOrder = (
  orderId: string,
  options?: UseMutationOptions<HttpTypes.AdminOrderResponse, ClientError, void>,
) => {
  return useMutation({
    mutationFn: () => sdk.admin.orders.$id.cancel.mutate({ $id: orderId }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.detail(orderId),
      });

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useRequestTransferOrder = (
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderResponse,
    ClientError,
    HttpTypes.AdminRequestOrderTransfer
  >,
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminRequestOrderTransfer) =>
      sdk.admin.orders.$id.transfer.mutate({ $id: orderId, ...payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      });

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.changes(orderId),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useCancelOrderTransfer = (
  orderId: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.admin.orders.$id.transfer.cancel.mutate>,
    ClientError,
    void
  >,
) => {
  return useMutation({
    mutationFn: () =>
      sdk.admin.orders.$id.transfer.cancel.mutate({ $id: orderId }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      });

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.changes(orderId),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useCreateOrderCreditLine = (
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderResponse,
    ClientError,
    Omit<CreateOrderCreditLineDTO, "order_id">
  >,
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.admin.orders.$id.creditLines.mutate({ $id: orderId, ...payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      });

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

type OrderCommissionLinesResponse = InferClientOutput<
  typeof sdk.admin.orders.$id.commissionLines.query
>;

export type OrderCommissionLine =
  OrderCommissionLinesResponse["commission_lines"][number];

export const useOrderCommissionLines = (
  id: string,
  options?: Omit<
    UseQueryOptions<
      OrderCommissionLinesResponse,
      ClientError,
      OrderCommissionLinesResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
): Omit<UseQueryResult<OrderCommissionLinesResponse, ClientError>, "data"> & {
  commission_lines: OrderCommissionLine[];
} => {
  const { data, ...rest } = useQuery({
    queryFn: async () =>
      sdk.admin.orders.$id.commissionLines.query({ $id: id }),
    queryKey: ordersQueryKeys.detail(`${id}/commission-lines`),
    ...options,
  });

  return { commission_lines: data?.commission_lines ?? [], ...rest };
};
