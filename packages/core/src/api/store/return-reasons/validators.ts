import { z } from "zod"
import { createFindParams, createSelectParams } from "@medusajs/medusa/api/utils/validators"

export type StoreReturnReasonParamsType = z.infer<typeof StoreReturnReasonParams>
export const StoreReturnReasonParams = createSelectParams()

export type StoreReturnReasonsParamsType = z.infer<typeof StoreReturnReasonsParams>
export const StoreReturnReasonsParams = createFindParams()
