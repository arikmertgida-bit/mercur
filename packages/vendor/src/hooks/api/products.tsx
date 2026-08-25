import {
  ClientError,
  InferClientInput,
  InferClientOutput,
} from "@mercurjs/client";
import {
  ProductAttributeBatchInput,
  ProductChangeDTO,
} from "@mercurjs/types";
import {
  InfiniteData,
  QueryKey,
  UseInfiniteQueryOptions,
  UseMutationOptions,
  useMutation,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query";
import { sdk } from "../../lib/client";
import { queryClient } from "../../lib/query-client";
import { queryKeysFactory } from "../../lib/query-key-factory";
import { inventoryItemsQueryKeys } from "./inventory.tsx";
import { productAttributesQueryKeys } from "./product-attributes.tsx";
import { useInfiniteList } from "../use-infinite-list.tsx";

const PRODUCTS_QUERY_KEY = "products" as const;
export const productsQueryKeys = queryKeysFactory(PRODUCTS_QUERY_KEY);

const VARIANTS_QUERY_KEY = "product_variants" as const;
export const variantsQueryKeys = queryKeysFactory(VARIANTS_QUERY_KEY);

const PRODUCT_CHANGE_QUERY_KEY = "product_change" as const;
export const productChangeQueryKeys = queryKeysFactory(
  PRODUCT_CHANGE_QUERY_KEY
);

type ProductChangeResponse = { product_change: ProductChangeDTO };

// --- Product queries ---

export const useProduct = (
  id: string,
  query?: Omit<
    InferClientInput<typeof sdk.vendor.products.$id.query>,
    "$id"
  >,
  options?: UseQueryOptions<
    unknown,
    ClientError,
    InferClientOutput<typeof sdk.vendor.products.$id.query>
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () => sdk.vendor.products.$id.query({ $id: id, ...query }),
    queryKey: productsQueryKeys.detail(id, query),
    ...options,
  });

  return { ...data, ...rest };
};

export const useProducts = (
  query?: InferClientInput<typeof sdk.vendor.products.query>,
  options?: UseQueryOptions<
    unknown,
    ClientError,
    InferClientOutput<typeof sdk.vendor.products.query>
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () => sdk.vendor.products.query({ ...query }),
    queryKey: productsQueryKeys.list(query),
    ...options,
  });

  return { ...data, ...rest };
};

export const useInfiniteProducts = (
  query?: Omit<
    InferClientInput<typeof sdk.vendor.products.query>,
    "offset" | "limit"
  > & {
    limit?: number;
  },
  options?: Omit<
    UseInfiniteQueryOptions<
      InferClientOutput<typeof sdk.vendor.products.query>,
      ClientError,
      InfiniteData<
        InferClientOutput<typeof sdk.vendor.products.query>,
        number
      >,
      InferClientOutput<typeof sdk.vendor.products.query>,
      QueryKey,
      number
    >,
    "queryFn" | "queryKey" | "initialPageParam" | "getNextPageParam"
  >
) => {
  return useInfiniteList({
    queryKey: (params) => productsQueryKeys.list(params),
    queryFn: (params) => sdk.vendor.products.query(params),
    query,
    options,
  });
};

export const useProductChange = (
  productId: string,
  options?: Omit<
    UseQueryOptions<ProductChangeResponse, ClientError, ProductChangeResponse>,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () =>
      sdk.vendor.products.$id.preview.query({ $id: productId }) as Promise<
        ProductChangeResponse
      >,
    queryKey: productChangeQueryKeys.detail(productId),
    ...options,
  });

  return { ...data, ...rest };
};

// --- Product mutations ---

export const useCreateProduct = (
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.products.mutate>,
    ClientError,
    InferClientInput<typeof sdk.vendor.products.mutate>
  >
) => {
  return useMutation({
    mutationFn: (payload) => sdk.vendor.products.mutate(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() });
      // Variants created with `manage_inventory: true` create inventory items.
      queryClient.invalidateQueries({
        queryKey: inventoryItemsQueryKeys.lists(),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUpdateProduct = (
  id: string,
  options?: UseMutationOptions<
    ProductChangeResponse,
    ClientError,
    Omit<InferClientInput<typeof sdk.vendor.products.$id.mutate>, "$id">
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.vendor.products.$id.mutate({
        $id: id,
        ...payload,
      }) as Promise<ProductChangeResponse>,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: productChangeQueryKeys.detail(id),
      });
      await queryClient.invalidateQueries({
        queryKey: productsQueryKeys.detail(id),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

type ProductListQueryData = InferClientOutput<typeof sdk.vendor.products.query>;

export const useDeleteProduct = (
  id: string,
  options?: UseMutationOptions<
    ProductChangeResponse,
    ClientError,
    void,
    { previousLists: [QueryKey, ProductListQueryData | undefined][] }
  >
) => {
  return useMutation({
    mutationFn: () =>
      sdk.vendor.products.$id.delete({ $id: id }) as Promise<
        ProductChangeResponse
      >,
    // Optimistic removal: the delete applies inline on the server (draft, or
    // any status once MEDUSA_FF_PRODUCT_REQUEST is off), so the row should
    // disappear the moment the vendor confirms — not after the next refetch.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: productsQueryKeys.lists() });

      const previousLists = queryClient.getQueriesData<ProductListQueryData>({
        queryKey: productsQueryKeys.lists(),
      });

      queryClient.setQueriesData<ProductListQueryData>(
        { queryKey: productsQueryKeys.lists() },
        (old) => {
          if (!old) {
            return old;
          }
          return {
            ...old,
            products: old.products.filter((product) => product.id !== id),
            count: Math.max(0, old.count - 1),
          };
        }
      );

      return { previousLists };
    },
    onError: (_error, _variables, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: productChangeQueryKeys.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: productsQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useCancelProductEdit = (
  id: string,
  options?: UseMutationOptions<
    ProductChangeResponse,
    ClientError,
    { internal_note?: string } | void
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.vendor.products.$id.cancel.mutate({
        $id: id,
        ...(payload ?? {}),
      }) as Promise<ProductChangeResponse>,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: productChangeQueryKeys.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: productsQueryKeys.detail(id),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

// --- Variant queries ---

export const useProductVariant = (
  productId: string,
  variantId: string,
  query?: Omit<
    InferClientInput<typeof sdk.vendor.products.$id.variants.$variantId.query>,
    "$id" | "$variantId"
  >,
  options?: UseQueryOptions<
    unknown,
    ClientError,
    InferClientOutput<
      typeof sdk.vendor.products.$id.variants.$variantId.query
    >
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () =>
      sdk.vendor.products.$id.variants.$variantId.query({
        $id: productId,
        $variantId: variantId,
        ...query,
      }),
    queryKey: variantsQueryKeys.detail(variantId, query),
    ...options,
  });

  return { ...data, ...rest };
};

export const useProductVariants = (
  productId: string,
  query?: Omit<
    InferClientInput<typeof sdk.vendor.products.$id.variants.query>,
    "$id"
  >,
  options?: UseQueryOptions<
    unknown,
    ClientError,
    InferClientOutput<typeof sdk.vendor.products.$id.variants.query>
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () =>
      sdk.vendor.products.$id.variants.query({ $id: productId, ...query }),
    queryKey: variantsQueryKeys.list({ productId, ...query }),
    ...options,
    enabled:
      !!productId && (options?.enabled !== undefined ? options.enabled : true),
  });

  return { ...data, ...rest };
};

// --- Variant mutations ---

export const useCreateProductVariant = (
  productId: string,
  options?: UseMutationOptions<
    ProductChangeResponse,
    ClientError,
    Omit<
      InferClientInput<typeof sdk.vendor.products.$id.variants.mutate>,
      "$id"
    >
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.vendor.products.$id.variants.mutate({
        $id: productId,
        ...payload,
      }) as Promise<ProductChangeResponse>,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: productChangeQueryKeys.detail(productId),
      });
      queryClient.invalidateQueries({
        queryKey: productsQueryKeys.detail(productId),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUpdateProductVariant = (
  productId: string,
  variantId: string,
  options?: UseMutationOptions<
    ProductChangeResponse,
    ClientError,
    Omit<
      InferClientInput<
        typeof sdk.vendor.products.$id.variants.$variantId.mutate
      >,
      "$id" | "$variantId"
    >
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.vendor.products.$id.variants.$variantId.mutate({
        $id: productId,
        $variantId: variantId,
        ...payload,
      }) as Promise<ProductChangeResponse>,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: productChangeQueryKeys.detail(productId),
      });
      queryClient.invalidateQueries({
        queryKey: productsQueryKeys.detail(productId),
      });
      queryClient.invalidateQueries({
        queryKey: variantsQueryKeys.detail(variantId),
      });
      // The variant list on the product detail page (`ProductVariantSection`)
      // reads this same key — without invalidating it too, an edited price
      // (or any other listed field) stays stale there until something else
      // happens to refetch it.
      queryClient.invalidateQueries({
        queryKey: variantsQueryKeys.lists(),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useDeleteVariant = (
  productId: string,
  variantId: string,
  options?: UseMutationOptions<ProductChangeResponse, ClientError, void>
) => {
  return useMutation({
    mutationFn: () =>
      sdk.vendor.products.$id.variants.$variantId.delete({
        $id: productId,
        $variantId: variantId,
      }) as Promise<ProductChangeResponse>,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: productChangeQueryKeys.detail(productId),
      });
      queryClient.invalidateQueries({
        queryKey: productsQueryKeys.detail(productId),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useDeleteVariantLazy = (
  productId: string,
  options?: UseMutationOptions<
    ProductChangeResponse,
    ClientError,
    { variantId: string }
  >
) => {
  return useMutation({
    mutationFn: ({ variantId }) =>
      sdk.vendor.products.$id.variants.$variantId.delete({
        $id: productId,
        $variantId: variantId,
      }) as Promise<ProductChangeResponse>,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: productChangeQueryKeys.detail(productId),
      });
      queryClient.invalidateQueries({
        queryKey: variantsQueryKeys.detail(variables.variantId),
      });
      queryClient.invalidateQueries({
        queryKey: productsQueryKeys.detail(productId),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

// --- Product attribute mutations ---

export type ProductAttributeBatchPayload = Omit<
  ProductAttributeBatchInput,
  "product_id"
>;

export const useBatchProductAttributes = (
  productId: string,
  options?: UseMutationOptions<
    ProductChangeResponse,
    ClientError,
    ProductAttributeBatchPayload
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.vendor.products.$id.attributes.batch.mutate({
        $id: productId,
        ...payload,
      }) as Promise<ProductChangeResponse>,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: productAttributesQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: productsQueryKeys.detail(productId),
      });
      queryClient.invalidateQueries({
        queryKey: productChangeQueryKeys.detail(productId),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useRemoveAttributeFromProduct = (
  productId: string,
  attributeId: string,
  options?: UseMutationOptions<ProductChangeResponse, ClientError, void>
) => {
  return useMutation({
    mutationFn: () =>
      sdk.vendor.products.$id.attributes.batch.mutate({
        $id: productId,
        remove: [attributeId],
      }) as Promise<ProductChangeResponse>,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: productAttributesQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: productsQueryKeys.detail(productId),
      });
      queryClient.invalidateQueries({
        queryKey: productChangeQueryKeys.detail(productId),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
