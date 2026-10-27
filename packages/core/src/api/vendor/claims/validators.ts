import { ClaimReason } from "@medusajs/framework/utils"
import { z } from "zod"
import {
  createFindParams,
  createOperatorMap,
  createSelectParams,
} from "@medusajs/medusa/api/utils/validators"
import { JsonRecordSchema } from "../../../utils/json-schema"

export type VendorGetClaimParamsType = z.infer<typeof VendorGetClaimParams>
export const VendorGetClaimParams = createSelectParams()

export const VendorGetClaimsParams = createFindParams({
  limit: 20,
  offset: 0,
}).merge(
  z.object({
    id: z.union([z.string(), z.array(z.string())]).optional(),
    order_id: z.union([z.string(), z.array(z.string())]).optional(),
    return_id: z.union([z.string(), z.array(z.string())]).optional(),
    created_at: createOperatorMap().optional(),
    updated_at: createOperatorMap().optional(),
  })
)
export type VendorGetClaimsParamsType = z.infer<typeof VendorGetClaimsParams>
/**
 * The list query as clients send it: every field, including those with a
 * default (`offset`, `limit`, ...), is optional on the wire.
 */
export type VendorGetClaimsParamsInput = Partial<VendorGetClaimsParamsType>

export const VendorPostOrderClaimsReq = z.object({
  // The values of Medusa's `OrderClaimType` ("refund" | "replace"), which is
  // what the begin-claim workflow takes.
  type: z.enum(["refund", "replace"]),
  order_id: z.string(),
  description: z.string().optional(),
  internal_note: z.string().optional(),
  reason_id: z.string().nullish(),
  metadata: JsonRecordSchema.nullish(),
})
export type VendorPostOrderClaimsReqType = z.infer<
  typeof VendorPostOrderClaimsReq
>

export const VendorPostCancelClaimReq = z.object({
  no_notification: z.boolean().optional(),
})
export type VendorPostCancelClaimReqType = z.infer<
  typeof VendorPostCancelClaimReq
>

export const VendorPostClaimItemsReq = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      quantity: z.number(),
      reason: z.nativeEnum(ClaimReason).optional(),
      description: z.string().optional(),
      internal_note: z.string().optional(),
      metadata: JsonRecordSchema.nullish(),
    })
  ),
})
export type VendorPostClaimItemsReqType = z.infer<typeof VendorPostClaimItemsReq>

export const VendorPostClaimsItemsActionReq = z.object({
  quantity: z.number().optional(),
  reason_id: z.string().nullish(),
  internal_note: z.string().nullish().optional(),
})
export type VendorPostClaimsItemsActionReqType = z.infer<
  typeof VendorPostClaimsItemsActionReq
>

export const VendorPostClaimsRequestReturnItemsReq = z.object({
  location_id: z.string().optional(),
  items: z.array(
    z.object({
      id: z.string(),
      quantity: z.number(),
      description: z.string().optional(),
      internal_note: z.string().optional(),
      reason_id: z.string().optional(),
      metadata: JsonRecordSchema.optional(),
    })
  ),
})
export type VendorPostClaimsRequestReturnItemsReqType = z.infer<
  typeof VendorPostClaimsRequestReturnItemsReq
>

export const VendorPostClaimsRequestItemsReturnActionReq = z.object({
  quantity: z.number().optional(),
  internal_note: z.string().nullish().optional(),
  reason_id: z.string().nullish().optional(),
  metadata: JsonRecordSchema.nullish().optional(),
})
export type VendorPostClaimsRequestItemsReturnActionReqType = z.infer<
  typeof VendorPostClaimsRequestItemsReturnActionReq
>

export const VendorPostClaimsAddItemsReq = z.object({
  items: z.array(
    z.object({
      variant_id: z.string(),
      quantity: z.number(),
      unit_price: z.number().optional(),
      internal_note: z.string().optional(),
      metadata: JsonRecordSchema.optional(),
    })
  ),
})
export type VendorPostClaimsAddItemsReqType = z.infer<
  typeof VendorPostClaimsAddItemsReq
>

export const VendorPostClaimsAddItemsActionReq = z.object({
  quantity: z.number().optional(),
  internal_note: z.string().nullish().optional(),
})
export type VendorPostClaimsAddItemsActionReqType = z.infer<
  typeof VendorPostClaimsAddItemsActionReq
>

export const VendorPostClaimsShippingReq = z.object({
  shipping_option_id: z.string(),
  custom_amount: z.number().optional(),
  description: z.string().optional(),
  internal_note: z.string().optional(),
  metadata: JsonRecordSchema.optional(),
})
export type VendorPostClaimsShippingReqType = z.infer<
  typeof VendorPostClaimsShippingReq
>

export const VendorPostClaimsShippingActionReq = z.object({
  custom_amount: z.number().nullish().optional(),
  internal_note: z.string().nullish().optional(),
  metadata: JsonRecordSchema.nullish().optional(),
})
export type VendorPostClaimsShippingActionReqType = z.infer<
  typeof VendorPostClaimsShippingActionReq
>
