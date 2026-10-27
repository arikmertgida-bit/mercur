import { DeleteResponse, HttpTypes, PaginatedResponse, PromotionRuleDTO } from "@medusajs/types"

import { PromotionCostDTO } from "../promotion-cost"

// The vendor routes serialize the same `promotion` graph the admin routes do,
// so the wire shape (string dates, `created_at`, nested `campaign`) is Medusa's
// HTTP promotion — not the module-level `PromotionDTO`.
export type VendorPromotion = HttpTypes.AdminPromotion

export type VendorPromotionRule = PromotionRuleDTO

export type VendorPromotionResponse = {
  promotion: VendorPromotion
}

export type VendorPromotionListResponse = PaginatedResponse<{
  promotions: VendorPromotion[]
}>

export type VendorPromotionDeleteResponse = DeleteResponse<"promotion">

export type VendorPromotionRuleValue = {
  id?: string
  value: string
  label?: string
}

/**
 * A rule as `GET /vendor/promotions/:id/:rule_type` presents it: the stored
 * rule merged with its attribute definition and labels. Disguised rules
 * (application method columns shown as rules) are included too; the quantity
 * ones carry their number directly instead of value options.
 */
export type VendorPromotionRuleDetail = Partial<VendorRuleAttributeOption> & {
  id?: string
  attribute?: string
  attribute_label?: string
  operator?: string
  operator_label?: string
  disguised?: boolean
  hydrate?: boolean
  values?: VendorPromotionRuleValue[] | number | null
}

export type VendorPromotionRuleListResponse = {
  rules: VendorPromotionRuleDetail[]
}

// `GET /admin/promotions/:id/:rule_type` presents rules the same way.
export type AdminPromotionRuleDetail = VendorPromotionRuleDetail

export type AdminPromotionRuleDetailListResponse = {
  rules: AdminPromotionRuleDetail[]
}

export type AdminPromotionCostResponse = {
  promotion_cost: PromotionCostDTO
}

export type VendorPromotionRuleBatchResponse = {
  created: VendorPromotionRule[]
  updated: VendorPromotionRule[]
  deleted: {
    ids: string[]
    object: string
    deleted: boolean
  }
}

export type VendorRuleAttributeOption = {
  id: string
  value: string
  label: string
  required: boolean
  field_type: string
  operators: {
    id: string
    value: string
    label: string
  }[]
}

export type VendorRuleAttributeOptionsListResponse = {
  attributes: VendorRuleAttributeOption[]
}

export type VendorRuleValueOption = {
  label: string
  value: string
}

export type VendorRuleValueOptionsListResponse = PaginatedResponse<{
  values: VendorRuleValueOption[]
}>
