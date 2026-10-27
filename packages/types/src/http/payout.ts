import { PaginatedResponse } from "@medusajs/types"
import { OnboardingDTO, PayoutAccountDTO, PayoutDTO } from "../payout"

export interface VendorPayoutAccountResponse {
  payout_account: PayoutAccountDTO
}

export type VendorPayoutAccountListResponse = PaginatedResponse<{
  payout_accounts: PayoutAccountDTO[]
}>

export interface VendorOnboardingResponse {
  onboarding: OnboardingDTO
}

// The payout's BigNumber `amount` serializes to a plain number on the wire.
export type VendorPayout = Omit<PayoutDTO, "amount"> & { amount: number }

export interface VendorPayoutResponse {
  payout: VendorPayout
}

export type VendorPayoutListResponse = PaginatedResponse<{
  payouts: VendorPayout[]
}>

// Same wire shape as the vendor payout routes: `amount` is a plain number.
export type AdminPayout = VendorPayout

export interface AdminPayoutResponse {
  payout: AdminPayout
}

export type AdminPayoutListResponse = PaginatedResponse<{
  payouts: AdminPayout[]
}>

export interface AdminPayoutAccountResponse {
  payout_account: PayoutAccountDTO
}

export type AdminPayoutAccountListResponse = PaginatedResponse<{
  payout_accounts: PayoutAccountDTO[]
}>
