import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";
import { client } from "../../lib/client";
import {
  ClientError,
  InferClientInput,
  InferClientOutput,
} from "@mercurjs/client";

const REQUESTS_QUERY_KEY = "vendor_requests" as const;
export const requestsQueryKeys = queryKeysFactory(REQUESTS_QUERY_KEY);

type RequestType =
  | "product_category"
  | "product_collection"
  | "product_tag"
  | "product_type";

const requestClients = {
  product_category: client.vendor.requests.productCategories,
  product_collection: client.vendor.requests.productCollections,
  product_tag: client.vendor.requests.productTags,
  product_type: client.vendor.requests.productTypes,
};

type RequestClients = typeof requestClients;

type VendorRequestListQuery = {
  [K in RequestType]: InferClientInput<RequestClients[K]["query"]>;
};

type VendorRequestListResponse = InferClientOutput<
  RequestClients[RequestType]["query"]
>;

type VendorCreateRequestPayload = {
  [K in RequestType]: InferClientInput<RequestClients[K]["mutate"]>;
};

type VendorCreateRequestResponse = InferClientOutput<
  RequestClients[RequestType]["mutate"]
>;

export type VendorRequestDTO = VendorRequestListResponse["requests"][number];

// Mapped over `RequestType` so that indexing with a generic `T` keeps the
// per-type payload correlated with the client it is sent to.
const listRequests: {
  [K in RequestType]: (
    query: VendorRequestListQuery[K],
  ) => Promise<VendorRequestListResponse>;
} = {
  product_category: (query) =>
    client.vendor.requests.productCategories.query(query),
  product_collection: (query) =>
    client.vendor.requests.productCollections.query(query),
  product_tag: (query) => client.vendor.requests.productTags.query(query),
  product_type: (query) => client.vendor.requests.productTypes.query(query),
};

const createRequest: {
  [K in RequestType]: (
    payload: VendorCreateRequestPayload[K],
  ) => Promise<VendorCreateRequestResponse>;
} = {
  product_category: (payload) =>
    client.vendor.requests.productCategories.mutate(payload),
  product_collection: (payload) =>
    client.vendor.requests.productCollections.mutate(payload),
  product_tag: (payload) => client.vendor.requests.productTags.mutate(payload),
  product_type: (payload) =>
    client.vendor.requests.productTypes.mutate(payload),
};

export const useVendorRequests = <T extends RequestType>(
  type: T,
  query?: VendorRequestListQuery[T],
  options?: Omit<
    UseQueryOptions<
      VendorRequestListResponse,
      ClientError,
      VendorRequestListResponse
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: requestsQueryKeys.list({ type, ...query }),
    queryFn: async () => listRequests[type]({ ...query }),
    ...options,
  });

  return { ...data, ...rest };
};

export const useCreateVendorRequest = <T extends RequestType>(
  type: T,
  options?: UseMutationOptions<
    VendorCreateRequestResponse,
    ClientError,
    VendorCreateRequestPayload[T]
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VendorCreateRequestPayload[T]) =>
      createRequest[type](payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: requestsQueryKeys.lists(),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
