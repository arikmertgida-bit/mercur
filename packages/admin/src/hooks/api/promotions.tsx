import { HttpTypes } from "@medusajs/types"
import {
  ClientError,
  InferClientInput,
  InferClientOutput,
} from "@mercurjs/client"
import { HttpTypes as MercurHttpTypes } from "@mercurjs/types"
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query"
import { sdk } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { campaignsQueryKeys } from "./campaigns"

const PROMOTIONS_QUERY_KEY = "promotions" as const
export const promotionsQueryKeys = {
  ...queryKeysFactory(PROMOTIONS_QUERY_KEY),
  // TODO: handle invalidations properly
  listRules: (
    id: string | null,
    ruleType: string,
    query?: PromotionRulesQuery
  ) => [PROMOTIONS_QUERY_KEY, id, ruleType, query],
  listRuleAttributes: (
    ruleType: string,
    promotionType?: string,
    applicationMethodTargetType?: string
  ) => [
    PROMOTIONS_QUERY_KEY,
    ruleType,
    promotionType,
    applicationMethodTargetType,
  ],
  listRuleValues: (
    ruleType: string,
    ruleValue: string,
    query: HttpTypes.AdminGetPromotionsRuleValueParams
  ) => [PROMOTIONS_QUERY_KEY, ruleType, ruleValue, query],
}

export const usePromotion = (
  id: string,
  query?: HttpTypes.AdminGetPromotionParams,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminPromotionResponse,
      ClientError,
      HttpTypes.AdminPromotionResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.detail(id, query),
    queryFn: async () => sdk.admin.promotions.$id.query({ $id: id, ...query }),
    ...options,
  })

  return { ...data, ...rest }
}

type UpsertPromotionCostPayload = {
  id: string
  cost_bearer: "store" | "marketplace" | "shared"
  shared_marketplace_percentage?: number | null
}

export const useUpsertPromotionCost = (
  options?: UseMutationOptions<
    MercurHttpTypes.AdminPromotionCostResponse,
    ClientError,
    UpsertPromotionCostPayload
  >
) => {
  return useMutation({
    mutationFn: ({ id, ...payload }: UpsertPromotionCostPayload) =>
      sdk.admin.promotions.$id.cost.mutate({ $id: id, ...payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.detail(variables.id) })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// A promotion that is still being created has no id yet; Medusa's
// `GET /admin/promotions/:id/:rule_type` then derives the rule attributes from
// the `promotion_type` / `application_method_*` query params. Medusa's own
// dashboard sends the literal "null" segment in that case.
const UNSAVED_PROMOTION_ID = "null"

export type PromotionRulesQuery = Omit<
  InferClientInput<typeof sdk.admin.promotions.$id.$ruleType.query>,
  "$id" | "$ruleType"
>

export const usePromotionRules = (
  id: string | null,
  ruleType: string,
  query?: PromotionRulesQuery,
  options?: Omit<
    UseQueryOptions<
      MercurHttpTypes.AdminPromotionRuleDetailListResponse,
      ClientError,
      MercurHttpTypes.AdminPromotionRuleDetailListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.listRules(id, ruleType, query),
    queryFn: async () =>
      sdk.admin.promotions.$id.$ruleType.query({
        $id: id ?? UNSAVED_PROMOTION_ID,
        $ruleType: ruleType,
        ...query,
      }),
    ...options,
  })

  return { ...data, ...rest }
}

export const usePromotions = (
  query?: HttpTypes.AdminGetPromotionsParams,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminPromotionListResponse,
      ClientError,
      HttpTypes.AdminPromotionListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.list(query),
    queryFn: async () => sdk.admin.promotions.query({ ...query }),
    ...options,
  })

  return { ...data, ...rest }
}

export const usePromotionRuleAttributes = (
  ruleType: string,
  promotionType?: string,
  applicationMethodTargetType?: string,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminRuleAttributeOptionsListResponse,
      ClientError,
      HttpTypes.AdminRuleAttributeOptionsListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.listRuleAttributes(
      ruleType,
      promotionType,
      applicationMethodTargetType
    ),
    queryFn: async () =>
      sdk.admin.promotions.ruleAttributeOptions.$ruleType.query({
        $ruleType: ruleType,
        promotion_type: promotionType,
        application_method_target_type: applicationMethodTargetType,
      }),
    ...options,
  })

  return { ...data, ...rest }
}

export const usePromotionRuleValues = (
  ruleType: string,
  ruleValue: string,
  query?: HttpTypes.AdminGetPromotionsRuleValueParams,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminRuleValueOptionsListResponse,
      ClientError,
      HttpTypes.AdminRuleValueOptionsListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.listRuleValues(
      ruleType,
      ruleValue,
      query || {}
    ),
    queryFn: async () =>
      sdk.admin.promotions.ruleValueOptions.$ruleType.$ruleAttributeId.query({
        $ruleType: ruleType,
        $ruleAttributeId: ruleValue,
        ...query,
      }),
    ...options,
  })

  return { ...data, ...rest }
}

export const useDeletePromotion = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.DeleteResponse<"promotion">,
    ClientError,
    void
  >
) => {
  return useMutation({
    mutationFn: () => sdk.admin.promotions.$id.delete({ $id: id }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: promotionsQueryKeys.detail(id),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useCreatePromotion = (
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    ClientError,
    HttpTypes.AdminCreatePromotion
  >
) => {
  return useMutation({
    mutationFn: (payload) => sdk.admin.promotions.mutate(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: campaignsQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdatePromotion = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    ClientError,
    HttpTypes.AdminUpdatePromotion
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.admin.promotions.$id.mutate({ $id: id, ...payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

type PromotionRulesBatchPayload = Omit<
  InferClientInput<typeof sdk.admin.promotions.$id.rules.batch.mutate>,
  "$id"
>

type PromotionRulesBatchResponse = InferClientOutput<
  typeof sdk.admin.promotions.$id.rules.batch.mutate
>

// Each rule type has its own batch route; `ruleType` is the URL segment of
// the edit-rules page ("rules" | "buy-rules" | "target-rules").
const batchPromotionRules = (
  id: string,
  ruleType: string,
  payload: PromotionRulesBatchPayload
) => {
  if (ruleType === "buy-rules") {
    return sdk.admin.promotions.$id.buyRules.batch.mutate({
      $id: id,
      ...payload,
    })
  }
  if (ruleType === "target-rules") {
    return sdk.admin.promotions.$id.targetRules.batch.mutate({
      $id: id,
      ...payload,
    })
  }
  return sdk.admin.promotions.$id.rules.batch.mutate({ $id: id, ...payload })
}

const usePromotionRulesBatch = (
  id: string,
  ruleType: string,
  options?: UseMutationOptions<
    PromotionRulesBatchResponse,
    ClientError,
    PromotionRulesBatchPayload
  >
) => {
  return useMutation({
    mutationFn: (payload) => batchPromotionRules(id, ruleType, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const usePromotionAddRules = usePromotionRulesBatch
export const usePromotionRemoveRules = usePromotionRulesBatch
export const usePromotionUpdateRules = usePromotionRulesBatch
