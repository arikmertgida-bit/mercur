import { HttpTypes } from "@medusajs/types"

// Serialized like the admin fulfillment set routes: Medusa's HTTP shapes.
export type VendorFulfillmentSet = HttpTypes.AdminFulfillmentSet
export type VendorServiceZone = HttpTypes.AdminServiceZone

export interface VendorFulfillmentSetResponse {
  /**
   * The fulfillment set's details.
   */
  fulfillment_set: VendorFulfillmentSet
}

export interface VendorServiceZoneResponse {
  /**
   * The service zone's details.
   */
  service_zone: VendorServiceZone
}

export interface VendorServiceZoneDeleteResponse {
  /**
   * The ID of the deleted service zone.
   */
  id: string
  /**
   * The type of the deleted resource.
   */
  object: "service_zone"
  /**
   * Whether the service zone was deleted.
   */
  deleted: boolean
}
