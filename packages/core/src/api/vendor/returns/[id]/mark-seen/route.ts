import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MercurModules } from "@mercurjs/types"
import type { CustomFieldsModuleService } from "@mercurjs/core/modules/custom-fields"

import { validateSellerReturn } from "../../helpers"

type MarkReturnSeenResponse = { id: string; vendor_seen_at: string }

/**
 * Idempotent — opening the same return's detail page twice just refreshes
 * `vendor_seen_at`, it never re-increments anything (the badge count is
 * derived fresh from `unseen-count` on every read, not stored as a counter).
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<MarkReturnSeenResponse>
): Promise<void> => {
  const { id } = req.params
  const sellerId = req.seller_context!.seller_id

  await validateSellerReturn(req.scope, sellerId, id)

  const customFieldsService = req.scope.resolve<CustomFieldsModuleService>(
    MercurModules.CUSTOM_FIELDS
  )

  const now = new Date()
  await customFieldsService.upsert("return", {
    id,
    vendor_seen_at: now,
  })

  res.json({ id, vendor_seen_at: now.toISOString() })
}
