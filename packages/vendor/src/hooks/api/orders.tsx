import {
  ClientError,
  InferClientInput,
  InferClientOutput,
} from "@mercurjs/client"

import { HttpTypes } from "@medusajs/types";
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { sdk, fetchQuery } from "../../lib/client";
import { queryClient } from "../../lib/query-client";
import { queryKeysFactory } from "../../lib/query-key-factory";
import { inventoryItemsQueryKeys } from "./inventory";
import { reservationItemsQueryKeys } from "./reservations";

const ORDERS_QUERY_KEY = "orders" as const;
const baseOrdersQueryKeys = queryKeysFactory(ORDERS_QUERY_KEY);

export const ordersQueryKeys = {
  ...baseOrdersQueryKeys,
  preview: (id: string) => [baseOrdersQueryKeys.detail(id), "preview"] as const,
  changes: (id: string) => [baseOrdersQueryKeys.detail(id), "changes"] as const,
};

export const useOrder = (
  id: string,
  query?: HttpTypes.AdminOrderFilters,
  options?: Omit<
    UseQueryOptions<
      InferClientOutput<typeof sdk.vendor.orders.$id.query>,
      ClientError,
      InferClientOutput<typeof sdk.vendor.orders.$id.query>
    >,
    "queryKey" | "queryFn"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => sdk.vendor.orders.$id.query({ $id: id, ...query }),
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
  >
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminUpdateOrder) =>
      sdk.vendor.orders.$id.mutate({ $id: id, ...payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.detail(id),
      });

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.changes(id),
      });

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
      HttpTypes.AdminOrderPreviewResponse
    >,
    "queryKey" | "queryFn"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () =>
      sdk.vendor.orders.$id.preview.query({ $id: id, ...query }),
    queryKey: ordersQueryKeys.preview(id),
    ...options,
  });

  return { ...data, ...rest };
};

export const useOrders = (
  query?: HttpTypes.AdminOrderListParams,
  options?: Omit<
    UseQueryOptions<
      InferClientOutput<typeof sdk.vendor.orders.query>,
      ClientError,
      InferClientOutput<typeof sdk.vendor.orders.query>
    >,
    "queryKey" | "queryFn"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => sdk.vendor.orders.query({ ...query }),
    queryKey: ordersQueryKeys.list(query),
    ...options,
  });

  return { ...data, ...rest };
};

export const useOrderChanges = (
  id: string,
  query?: Omit<
    InferClientInput<typeof sdk.vendor.orders.$id.changes.query>,
    "$id"
  >,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminOrderChangesResponse,
      ClientError,
      HttpTypes.AdminOrderChangesResponse
    >,
    "queryKey" | "queryFn"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () =>
      sdk.vendor.orders.$id.changes.query({ $id: id, ...query }),
    queryKey: ordersQueryKeys.changes(id),
    ...options,
  });

  return { ...data, ...rest };
};

export const useCreateOrderFulfillment = (
  orderId: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.orders.$id.fulfillments.mutate>,
    ClientError,
    HttpTypes.AdminCreateOrderFulfillment
  >
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminCreateOrderFulfillment) =>
      sdk.vendor.orders.$id.fulfillments.mutate({ $id: orderId, ...payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.all,
      });

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      });

      queryClient.invalidateQueries({
        queryKey: reservationItemsQueryKeys.lists(),
      });

      queryClient.invalidateQueries({
        queryKey: inventoryItemsQueryKeys.details(),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

type CancelOrderFulfillmentPayload = Omit<
  InferClientInput<
    typeof sdk.vendor.orders.$id.fulfillments.$fulfillmentId.cancel.mutate
  >,
  "$id" | "$fulfillmentId"
>;

export const useCancelOrderFulfillment = (
  orderId: string,
  fulfillmentId: string,
  options?: UseMutationOptions<
    InferClientOutput<
      typeof sdk.vendor.orders.$id.fulfillments.$fulfillmentId.cancel.mutate
    >,
    ClientError,
    CancelOrderFulfillmentPayload
  >
) => {
  return useMutation({
    mutationFn: (payload: CancelOrderFulfillmentPayload) =>
      sdk.vendor.orders.$id.fulfillments.$fulfillmentId.cancel.mutate({
        $id: orderId,
        $fulfillmentId: fulfillmentId,
        ...payload,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.all,
      });

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      });

      queryClient.invalidateQueries({
        queryKey: reservationItemsQueryKeys.lists(),
      });

      queryClient.invalidateQueries({
        queryKey: inventoryItemsQueryKeys.details(),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useCreateOrderShipment = (
  orderId: string,
  fulfillmentId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminOrderResponse,
    ClientError,
    HttpTypes.AdminCreateOrderShipment
  >
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminCreateOrderShipment) =>
      sdk.vendor.orders.$id.fulfillments.$fulfillmentId.shipments.mutate({
        $id: orderId,
        $fulfillmentId: fulfillmentId,
        ...payload,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.all,
      });

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useMarkOrderFulfillmentAsDelivered = (
  orderId: string,
  fulfillmentId: string,
  options?: UseMutationOptions<HttpTypes.AdminOrderResponse, ClientError, void>
) => {
  return useMutation({
    mutationFn: () =>
      sdk.vendor.orders.$id.fulfillments.$fulfillmentId.markAsDelivered.mutate({
        $id: orderId,
        $fulfillmentId: fulfillmentId,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.all,
      });

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useCancelOrder = (
  orderId: string,
  options?: UseMutationOptions<HttpTypes.AdminOrderResponse, ClientError, void>
) => {
  return useMutation({
    mutationFn: () =>
      sdk.vendor.orders.$id.cancel.mutate({ $id: orderId }),
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

export const useCompleteOrder = (
  orderId: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.orders.$id.complete.mutate>,
    ClientError,
    void
  >
) => {
  return useMutation({
    mutationFn: () =>
      fetchQuery(`/vendor/orders/${orderId}/complete`, {
        method: "POST",
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.detail(orderId),
      });

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      });

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.list(),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

type OrderCommissionLinesResponse = InferClientOutput<
  typeof sdk.vendor.orders.$id.commissionLines.query
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
      sdk.vendor.orders.$id.commissionLines.query({ $id: id }),
    queryKey: ordersQueryKeys.detail(`${id}/commission-lines`),
    ...options,
  });

  return { commission_lines: data?.commission_lines ?? [], ...rest };
};
