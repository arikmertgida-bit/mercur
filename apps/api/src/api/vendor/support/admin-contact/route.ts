import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getCatchMessage } from "../../../../lib/errors"
import { resolveAdminSupportUserId } from "../../../../lib/admin-support-contact"
import { resolveKayiLogger } from "../../../../lib/logger"

/**
 * GET /vendor/support/admin-contact
 *
 * Returns the admin user id used for vendor support conversations.
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
    logger.error(`[admin-contact] error: ${message}`)
    res.status(500).json({ error: "Internal server error" })
  }
}
