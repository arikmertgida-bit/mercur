import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { resolveAdminSupportUserId } from "../../../../lib/admin-support-contact"

type AdminContactResponse = { adminUserId: string }

/**
 * GET /vendor/support/admin-contact
 *
 * Returns the admin user id used for vendor support conversations.
 *
 * Throws instead of hand-rolling `res.json({ error })` so the response goes
 * through `vendorAwareErrorHandler` (apps/api/src/lib/vendor-error-i18n) and
 * comes back in the vendor's selected panel language instead of always
 * English.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminContactResponse>
): Promise<void> {
  const adminUserId = await resolveAdminSupportUserId(req.scope)
  if (!adminUserId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Admin user not found")
  }

  res.json({ adminUserId })
}
