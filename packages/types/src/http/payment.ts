import { HttpTypes, PaginatedResponse } from "@medusajs/types"

// Serialized by the vendor payment routes exactly like the admin routes do,
// so the wire shape is Medusa's HTTP payment — not the module `PaymentDTO`.
export type VendorPayment = HttpTypes.AdminPayment

export interface VendorPaymentResponse {
  /**
   * The payment's details.
   */
  payment: VendorPayment
}

export type VendorPaymentListResponse = PaginatedResponse<{
  /**
   * The list of payments.
   */
  payments: VendorPayment[]
}>

export type VendorPaymentProviderListResponse = PaginatedResponse<{
  /**
   * The list of payment providers.
   */
  payment_providers: HttpTypes.AdminPaymentProvider[]
}>
