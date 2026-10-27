import { z } from "zod"

export enum TaxRateRuleReferenceType {
  PRODUCT = "product",
  PRODUCT_TYPE = "product_type",
  SHIPPING_OPTION = "shipping_option",
  // PRODUCT_COLLECTION = "product_collection",
  // PRODUCT_TAG = "product_tag",
  // CUSTOMER_GROUP = "customer_group",
}

const TaxRateRuleReferenceTypeSchema = z.enum(TaxRateRuleReferenceType)

/** Narrows a tax rate rule's free-form `reference` to the types this UI handles. */
export const isTaxRateRuleReferenceType = (
  value: string
): value is TaxRateRuleReferenceType =>
  TaxRateRuleReferenceTypeSchema.safeParse(value).success
