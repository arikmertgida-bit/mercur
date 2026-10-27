import {
  DeleteResponse,
  HttpTypes,
  PaginatedResponse,
  ShippingOptionDTO,
  ShippingOptionRuleDTO,
} from "@medusajs/types"

// The vendor routes serialize the same `shipping_option` graph the admin
// routes do, so the wire shape (e.g. rule `value` as a plain string) is
// Medusa's HTTP shipping option — not the module-level `ShippingOptionDTO`.
export type VendorShippingOption = HttpTypes.AdminShippingOption

export interface VendorShippingOptionResponse {
  /**
   * The shipping option's details.
   */
  shipping_option: VendorShippingOption
}

export type VendorShippingOptionListResponse = PaginatedResponse<{
  /**
   * The list of shipping options.
   */
  shipping_options: VendorShippingOption[]
}>

export type VendorShippingOptionDeleteResponse = DeleteResponse<"shipping_option">

export interface VendorUpdateShippingOptionRulesResponse {
  /**
   * The created shipping option rules.
   */
  created: ShippingOptionRuleDTO[]
  /**
   * The updated shipping option rules.
   */
  updated: ShippingOptionRuleDTO[]
  /**
   * The deleted shipping option rules.
   */
  deleted: {
    ids: string[]
    object: "shipping_option_rule"
    deleted: boolean
  }
}

export interface StoreSellerShippingOptionsResponse {
  /**
   * The shipping options grouped by seller ID.
   */
  shipping_options: Record<string, ShippingOptionDTO[]>
}
