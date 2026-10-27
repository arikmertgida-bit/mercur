import { z } from "zod"
import {
  createFindParams,
  createSelectParams,
} from "@medusajs/medusa/api/utils/validators"
import { JsonRecordSchema } from "../../../utils/json-schema"

export type VendorGetPayoutAccountParamsType = z.infer<typeof VendorGetPayoutAccountParams>
export const VendorGetPayoutAccountParams = createSelectParams()

export type VendorGetPayoutAccountsParamsType = z.infer<typeof VendorGetPayoutAccountsParams>
export const VendorGetPayoutAccountsParams = createFindParams({
  limit: 20,
  offset: 0,
})

export type VendorCreatePayoutAccountType = z.infer<typeof VendorCreatePayoutAccount>
export const VendorCreatePayoutAccount = z
  .object({
    data: JsonRecordSchema.optional(),
    context: JsonRecordSchema.optional(),
  })
  .strict()

export type VendorCreateOnboardingType = z.infer<typeof VendorCreateOnboarding>
export const VendorCreateOnboarding = z
  .object({
    data: JsonRecordSchema.optional(),
    context: JsonRecordSchema.optional(),
  })
  .strict()
