import type { MedusaContainer } from "@medusajs/framework/types"
import { MercurModules } from "@mercurjs/types"

import CustomFieldsModuleService from "../modules/custom-fields/services/custom-fields-module-service"

const UNAPPROVED_REQUEST_STATUSES = ["pending", "rejected"] as const

/**
 * Return reasons submitted through the seller "Talep Et" (request) flow stay
 * hidden from customers (`/store/return-reasons`) and from other sellers
 * (`/vendor/return-reasons`) until an admin accepts the request — a return
 * reason with no `custom_fields` row at all was created directly by an admin
 * and is always visible.
 */
export async function getUnapprovedReturnReasonIds(
  container: MedusaContainer
): Promise<string[]> {
  const customFieldsService = container.resolve<CustomFieldsModuleService>(
    MercurModules.CUSTOM_FIELDS
  )

  const rows = await customFieldsService.list(
    "return_reason",
    { request_status: [...UNAPPROVED_REQUEST_STATUSES] },
    {}
  )

  return rows
    .map((row) => row["return_reason_id"])
    .filter((id): id is string => typeof id === "string")
}
