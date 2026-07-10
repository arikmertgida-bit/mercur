import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";
import { client } from "../../lib/client";
import { ClientError, InferClientInput, InferClientOutput } from "@mercurjs/client";

const REQUESTS_QUERY_KEY = "vendor_requests" as const;
export const requestsQueryKeys = queryKeysFactory(REQUESTS_QUERY_KEY);

export type ProductCollectionRequestDTO = InferClientOutput<
  typeof client.vendor.requests.productCollections.query
>["requests"][number];
export type ProductCategoryRequestDTO = InferClientOutput<
  typeof client.vendor.requests.productCategories.query
>["requests"][number];
export type ProductTypeRequestDTO = InferClientOutput<
  typeof client.vendor.requests.productTypes.query
>["requests"][number];
export type ProductTagRequestDTO = InferClientOutput<
  typeof client.vendor.requests.productTags.query
>["requests"][number];

export const useProductCollectionRequests = (
  query?: InferClientInput<typeof client.vendor.requests.productCollections.query>,
  options?: Omit<
    UseQueryOptions<
      unknown,
      ClientError,
      InferClientOutput<typeof client.vendor.requests.productCollections.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: requestsQueryKeys.list({ type: "product_collection", ...query }),
    queryFn: async () => client.vendor.requests.productCollections.query({ ...query }),
    ...options,
  });

  return { ...data, ...rest };
};

export const useCreateProductCollectionRequest = (
  options?: UseMutationOptions<
    InferClientOutput<typeof client.vendor.requests.productCollections.mutate>,
    ClientError,
    InferClientInput<typeof client.vendor.requests.productCollections.mutate>
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InferClientInput<typeof client.vendor.requests.productCollections.mutate>) =>
      client.vendor.requests.productCollections.mutate(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: requestsQueryKeys.lists() });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useProductCategoryRequests = (
  query?: InferClientInput<typeof client.vendor.requests.productCategories.query>,
  options?: Omit<
    UseQueryOptions<
      unknown,
      ClientError,
      InferClientOutput<typeof client.vendor.requests.productCategories.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: requestsQueryKeys.list({ type: "product_category", ...query }),
    queryFn: async () => client.vendor.requests.productCategories.query({ ...query }),
    ...options,
  });

  return { ...data, ...rest };
};

export const useCreateProductCategoryRequest = (
  options?: UseMutationOptions<
    InferClientOutput<typeof client.vendor.requests.productCategories.mutate>,
    ClientError,
    InferClientInput<typeof client.vendor.requests.productCategories.mutate>
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InferClientInput<typeof client.vendor.requests.productCategories.mutate>) =>
      client.vendor.requests.productCategories.mutate(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: requestsQueryKeys.lists() });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useProductTypeRequests = (
  query?: InferClientInput<typeof client.vendor.requests.productTypes.query>,
  options?: Omit<
    UseQueryOptions<
      unknown,
      ClientError,
      InferClientOutput<typeof client.vendor.requests.productTypes.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: requestsQueryKeys.list({ type: "product_type", ...query }),
    queryFn: async () => client.vendor.requests.productTypes.query({ ...query }),
    ...options,
  });

  return { ...data, ...rest };
};

export const useCreateProductTypeRequest = (
  options?: UseMutationOptions<
    InferClientOutput<typeof client.vendor.requests.productTypes.mutate>,
    ClientError,
    InferClientInput<typeof client.vendor.requests.productTypes.mutate>
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InferClientInput<typeof client.vendor.requests.productTypes.mutate>) =>
      client.vendor.requests.productTypes.mutate(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: requestsQueryKeys.lists() });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useProductTagRequests = (
  query?: InferClientInput<typeof client.vendor.requests.productTags.query>,
  options?: Omit<
    UseQueryOptions<
      unknown,
      ClientError,
      InferClientOutput<typeof client.vendor.requests.productTags.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: requestsQueryKeys.list({ type: "product_tag", ...query }),
    queryFn: async () => client.vendor.requests.productTags.query({ ...query }),
    ...options,
  });

  return { ...data, ...rest };
};

export const useCreateProductTagRequest = (
  options?: UseMutationOptions<
    InferClientOutput<typeof client.vendor.requests.productTags.mutate>,
    ClientError,
    InferClientInput<typeof client.vendor.requests.productTags.mutate>
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InferClientInput<typeof client.vendor.requests.productTags.mutate>) =>
      client.vendor.requests.productTags.mutate(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: requestsQueryKeys.lists() });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
