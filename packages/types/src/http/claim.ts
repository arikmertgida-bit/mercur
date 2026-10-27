/**
 * Medusa's `cancelOrderClaimWorkflow` produces no result, so the cancel route
 * answers with an empty body.
 */
export interface VendorCancelClaimResponse {
  claim?: undefined
}
