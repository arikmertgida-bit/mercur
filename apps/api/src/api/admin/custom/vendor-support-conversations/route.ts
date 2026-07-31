import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { resolveAdminSupportUserId } from "../../../../lib/admin-support-contact"

type VendorSupportConversationsResponse = { adminUserId: string }

/**
 * GET /admin/custom/vendor-support-conversations
 *
 * Returns the admin user id for vendor support conversation listing.
 *
 * Throws instead of hand-rolling `res.json({ error })` so the response goes
 * through `adminAwareErrorHandler` (apps/api/src/lib/admin-error-i18n) and
 * comes back in the admin's selected panel language instead of always
 * English.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<VendorSupportConversationsResponse>
): Promise<void> {
  const adminUserId = await resolveAdminSupportUserId(req.scope)
  if (!adminUserId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Admin user not found")
  }

  res.json({ adminUserId })
}
