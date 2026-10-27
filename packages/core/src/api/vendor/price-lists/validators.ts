import { z } from "zod"
import {
  createFindParams,
  createOperatorMap,
  createSelectParams,
} from "@medusajs/medusa/api/utils/validators"

// The values of Medusa's `PriceListStatus` / `PriceListType`, listed as
// literals so the typed client accepts plain strings (`z.nativeEnum` would
// make the request types the nominal enums).
const PriceListStatusSchema = z.enum(["active", "draft"])
const PriceListTypeSchema = z.enum(["sale", "override"])

export type VendorGetPriceListParamsType = z.infer<
  typeof VendorGetPriceListParams
>
export const VendorGetPriceListParams = createSelectParams()

export type VendorGetPriceListsParamsType = z.infer<
  typeof VendorGetPriceListsParams
>
export const VendorGetPriceListsParams = createFindParams({
  offset: 0,
  limit: 50,
}).merge(
  z.object({
    q: z.string().optional(),
    id: z.union([z.string(), z.array(z.string())]).optional(),
    type: z.array(PriceListTypeSchema).optional(),
    starts_at: createOperatorMap().optional(),
    ends_at: createOperatorMap().optional(),
    created_at: createOperatorMap().optional(),
    updated_at: createOperatorMap().optional(),
    status: z.array(PriceListStatusSchema).optional(),
  })
)

export type VendorCreatePriceListPriceType = z.infer<
  typeof VendorCreatePriceListPrice
>
export const VendorCreatePriceListPrice = z.object({
  currency_code: z.string(),
  amount: z.number(),
  variant_id: z.string(),
  min_quantity: z.number().nullish(),
  max_quantity: z.number().nullish(),
  rules: z.record(z.string(), z.string()).optional(),
})

export type VendorUpdatePriceListPriceType = z.infer<
  typeof VendorUpdatePriceListPrice
>
export const VendorUpdatePriceListPrice = z.object({
  id: z.string(),
  currency_code: z.string().optional(),
  amount: z.number().optional(),
  variant_id: z.string(),
  min_quantity: z.number().nullish(),
  max_quantity: z.number().nullish(),
  rules: z.record(z.string(), z.string()).optional(),
})

export type VendorGetPriceListPricesParamsType = z.infer<
  typeof VendorGetPriceListPricesParams
>
export const VendorGetPriceListPricesParams = createFindParams({
  offset: 0,
  limit: 50,
})

export type VendorGetPriceListProductsParamsType = z.infer<
  typeof VendorGetPriceListProductsParams
>
export const VendorGetPriceListProductsParams = createFindParams({
  offset: 0,
  limit: 10,
}).merge(
  z.object({
    q: z.string().optional(),
    order: z.string().optional(),
  })
)

export type VendorCreatePriceListType = z.infer<typeof VendorCreatePriceList>
export const VendorCreatePriceList = z.object({
  title: z.string(),
  description: z.string(),
  starts_at: z.string().nullish(),
  ends_at: z.string().nullish(),
  status: PriceListStatusSchema.optional(),
  type: PriceListTypeSchema.optional(),
  rules: z.record(z.string(), z.array(z.string())).optional(),
  prices: z.array(VendorCreatePriceListPrice).optional(),
})

export type VendorUpdatePriceListType = z.infer<typeof VendorUpdatePriceList>
export const VendorUpdatePriceList = z.object({
  title: z.string().optional(),
  description: z.string().nullish(),
  starts_at: z.string().nullish(),
  ends_at: z.string().nullish(),
  status: PriceListStatusSchema.optional(),
  type: PriceListTypeSchema.optional(),
  rules: z.record(z.string(), z.array(z.string())).optional(),
})
