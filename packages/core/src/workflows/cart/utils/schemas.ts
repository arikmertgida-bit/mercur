import { JsonRecordSchema } from "../../../utils/json-schema"

// Hook results merged into the shipping option pricing/query contexts.
export const pricingContextResult = JsonRecordSchema.optional()
export const shippingOptionsContextResult = JsonRecordSchema.optional()
