import {
  ClientError,
  InferClientInput,
  InferClientOutput,
} from "@mercurjs/client";
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query";
import { sdk, fetchQuery } from "../../lib/client";
import { queryClient } from "../../lib/query-client";
import { queryKeysFactory } from "../../lib/query-key-factory";
import { campaignsQueryKeys } from "./campaigns";
import { HttpTypes } from "@mercurjs/types";

type PromotionRulesQuery = Omit<
  InferClientInput<typeof sdk.vendor.promotions.$id.$ruleType.query>,
  "$id" | "$ruleType"
>;

type RuleAttributeOptionsQuery = InferClientInput<
  typeof sdk.vendor.promotions.ruleAttributeOptions.$ruleType.query
>;

type RuleValueOptionsQuery = Omit<
  InferClientInput<
    typeof sdk.vendor.promotions.ruleValueOptions.$ruleType.$ruleAttributeId.query
  >,
  "ruleType" | "ruleAttributeId"
>;

const PROMOTIONS_QUERY_KEY = "promotions" as const;
export const promotionsQueryKeys = {
  ...queryKeysFactory(PROMOTIONS_QUERY_KEY),
  listRules: (
    id: string | null,
    ruleType: string,
    query?: PromotionRulesQuery,
  ) => [PROMOTIONS_QUERY_KEY, id, ruleType, query],
  listRuleAttributes: (
    ruleType: string,
    promotionType?: string,
    applicationMethodTargetType?: string,
    applicationMethodType?: string,
  ) => [
    PROMOTIONS_QUERY_KEY,
    ruleType,
    promotionType,
    applicationMethodTargetType,
    applicationMethodType,
  ],
  listRuleValues: (
    ruleType: string,
    ruleValue: string,
    query?: RuleValueOptionsQuery,
  ) => [PROMOTIONS_QUERY_KEY, ruleType, ruleValue, query],
};

export const usePromotion = (
  id: string,
  query?: Omit<
    InferClientInput<typeof sdk.vendor.promotions.$id.query>,
    "$id"
  >,
  options?: Omit<
    UseQueryOptions<
      InferClientOutput<typeof sdk.vendor.promotions.$id.query>,
      ClientError,
      InferClientOutput<typeof sdk.vendor.promotions.$id.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.detail(id, query),
    queryFn: async () => sdk.vendor.promotions.$id.query({ $id: id, ...query }),
    ...options,
  });

  return { ...data, ...rest };
};

export const usePromotionRules = (
  id: string | null,
  ruleType: string,
  query?: Omit<
    InferClientInput<typeof sdk.vendor.promotions.$id.$ruleType.query>,
    "$id" | "$ruleType"
  >,
  options?: Omit<
    UseQueryOptions<
      InferClientOutput<typeof sdk.vendor.promotions.$id.$ruleType.query>,
      ClientError,
      InferClientOutput<typeof sdk.vendor.promotions.$id.$ruleType.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.listRules(id, ruleType, query),
    queryFn: async () => {
      // A promotion that is still being created has no rules to load; the
      // callers disable the query until the id exists.
      if (id === null) {
        throw new Error("usePromotionRules requires a promotion id");
      }

      return sdk.vendor.promotions.$id.$ruleType.query({
        $id: id,
        $ruleType: ruleType,
        ...query,
      });
    },
    ...options,
  });

  return { ...data, ...rest };
};

export const usePromotions = (
  query?: InferClientInput<typeof sdk.vendor.promotions.query>,
  options?: Omit<
    UseQueryOptions<
      InferClientOutput<typeof sdk.vendor.promotions.query>,
      ClientError,
      InferClientOutput<typeof sdk.vendor.promotions.query>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.list(query),
    queryFn: async () => sdk.vendor.promotions.query({ ...query }),
    ...options,
  });

  return { ...data, ...rest };
};

export const usePromotionRuleAttributes = (
  ruleType: string,
  promotionType?: RuleAttributeOptionsQuery["promotion_type"],
  applicationMethodTargetType?: RuleAttributeOptionsQuery["application_method_target_type"],
  applicationMethodType?: RuleAttributeOptionsQuery["application_method_type"],
  options?: Omit<
    UseQueryOptions<
      InferClientOutput<
        typeof sdk.vendor.promotions.ruleAttributeOptions.$ruleType.query
      >,
      ClientError,
      InferClientOutput<
        typeof sdk.vendor.promotions.ruleAttributeOptions.$ruleType.query
      >
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.listRuleAttributes(
      ruleType,
      promotionType,
      applicationMethodTargetType,
      applicationMethodType,
    ),
    queryFn: async () =>
      sdk.vendor.promotions.ruleAttributeOptions.$ruleType.query({
        $ruleType: ruleType,
        promotion_type: promotionType,
        application_method_target_type: applicationMethodTargetType,
        application_method_type: applicationMethodType,
      }),
    ...options,
  });

  return { ...data, ...rest };
};

export const usePromotionRuleValues = (
  ruleType: string,
  ruleValue: string,
  query?: Omit<
    InferClientInput<
      typeof sdk.vendor.promotions.ruleValueOptions.$ruleType.$ruleAttributeId.query
    >,
    "ruleType" | "ruleAttributeId"
  >,
  options?: Omit<
    UseQueryOptions<
      InferClientOutput<
        typeof sdk.vendor.promotions.ruleValueOptions.$ruleType.$ruleAttributeId.query
      >,
      ClientError,
      InferClientOutput<
        typeof sdk.vendor.promotions.ruleValueOptions.$ruleType.$ruleAttributeId.query
      >
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.listRuleValues(ruleType, ruleValue, query),
    queryFn: async () =>
      sdk.vendor.promotions.ruleValueOptions.$ruleType.$ruleAttributeId.query({
        ...query,
        $ruleType: ruleType,
        $ruleAttributeId: ruleValue,
        limit: query?.limit ?? 100,
        offset: query?.offset ?? 0,
      }),
    ...options,
  });

  return { ...data, ...rest };
};

export const useDeletePromotion = (
  id: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.promotions.$id.delete>,
    ClientError,
    void
  >,
) => {
  return useMutation({
    mutationFn: () => sdk.vendor.promotions.$id.delete({ $id: id }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: promotionsQueryKeys.detail(id),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useGenerateVendorPromotionCode = (
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.promotions.generateCode.query>,
    ClientError,
    void
  >,
) => {
  return useMutation({
    mutationFn: async () => sdk.vendor.promotions.generateCode.query(),
    ...options,
  });
};

export const useCreatePromotion = (
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.promotions.mutate>,
    ClientError,
    InferClientInput<typeof sdk.vendor.promotions.mutate>
  >,
) => {
  return useMutation({
    mutationFn: (payload) => sdk.vendor.promotions.mutate(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignsQueryKeys.lists() });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUpdatePromotion = (
  id: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.promotions.$id.mutate>,
    ClientError,
    Omit<InferClientInput<typeof sdk.vendor.promotions.$id.mutate>, "$id">
  >,
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.vendor.promotions.$id.mutate({ $id: id, ...payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const usePromotionAddRules = (
  id: string,
  ruleType: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.promotions.$id.rules.batch.mutate>,
    ClientError,
    Omit<
      InferClientInput<typeof sdk.vendor.promotions.$id.rules.batch.mutate>,
      "$id"
    >
  >,
) => {
  return useMutation({
    mutationFn: (payload) => {
      if (ruleType === "buy-rules") {
        return sdk.vendor.promotions.$id.buyRules.batch.mutate({
          $id: id,
          ...payload,
        });
      }
      if (ruleType === "target-rules") {
        return sdk.vendor.promotions.$id.targetRules.batch.mutate({
          $id: id,
          ...payload,
        });
      }
      return sdk.vendor.promotions.$id.rules.batch.mutate({
        $id: id,
        ...payload,
      });
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const usePromotionRemoveRules = (
  id: string,
  ruleType: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.promotions.$id.rules.batch.mutate>,
    ClientError,
    Omit<
      InferClientInput<typeof sdk.vendor.promotions.$id.rules.batch.mutate>,
      "$id"
    >
  >,
) => {
  return useMutation({
    mutationFn: (payload) => {
      if (ruleType === "buy-rules") {
        return sdk.vendor.promotions.$id.buyRules.batch.mutate({
          $id: id,
          ...payload,
        });
      }
      if (ruleType === "target-rules") {
        return sdk.vendor.promotions.$id.targetRules.batch.mutate({
          $id: id,
          ...payload,
        });
      }
      return sdk.vendor.promotions.$id.rules.batch.mutate({
        $id: id,
        ...payload,
      });
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const usePromotionUpdateRules = (
  id: string,
  ruleType: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.vendor.promotions.$id.rules.batch.mutate>,
    ClientError,
    Omit<
      InferClientInput<typeof sdk.vendor.promotions.$id.rules.batch.mutate>,
      "$id"
    >
  >,
) => {
  return useMutation({
    mutationFn: (payload) => {
      if (ruleType === "buy-rules") {
        return sdk.vendor.promotions.$id.buyRules.batch.mutate({
          $id: id,
          ...payload,
        });
      }
      if (ruleType === "target-rules") {
        return sdk.vendor.promotions.$id.targetRules.batch.mutate({
          $id: id,
          ...payload,
        });
      }
      return sdk.vendor.promotions.$id.rules.batch.mutate({
        $id: id,
        ...payload,
      });
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useRemovePromotionFromCampaign = (
  promotionId: string,
  options?: UseMutationOptions<
    HttpTypes.VendorPromotionResponse,
    Error,
    void
  >,
) => {
  return useMutation({
    mutationFn: () =>
      fetchQuery(`/vendor/promotions/${promotionId}`, {
        method: "POST",
        body: { campaign_id: null },
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: promotionsQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: campaignsQueryKeys.details(),
      });
      queryClient.invalidateQueries({
        queryKey: campaignsQueryKeys.lists(),
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
