import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getCatchMessage } from "../../../../lib/errors"
import { resolveAdminSupportUserId } from "../../../../lib/admin-support-contact"
import { resolveKayiLogger } from "../../../../lib/logger"

/**
 * GET /admin/custom/vendor-support-conversations
 *
 * Returns the admin user id for vendor support conversation listing.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const logger = resolveKayiLogger(req.scope)

  try {
    const adminUserId = await resolveAdminSupportUserId(req.scope)
    if (!adminUserId) {
      res.status(404).json({ error: "No admin user found" })
      return
    }

    res.json({ adminUserId })
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    logger.error(`[vendor-support-conversations] error: ${message}`)
    res.status(500).json({ error: "Internal server error" })
  }
}
