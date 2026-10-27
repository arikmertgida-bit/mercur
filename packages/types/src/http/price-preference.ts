import { HttpTypes, PaginatedResponse } from "@medusajs/types"

// Serialized like the admin price-preference routes: Medusa's HTTP shape.
export type VendorPricePreference = HttpTypes.AdminPricePreference

export interface VendorPricePreferenceResponse {
  price_preference: VendorPricePreference
}

export type VendorPricePreferenceListResponse = PaginatedResponse<{
  price_preferences: VendorPricePreference[]
}>
