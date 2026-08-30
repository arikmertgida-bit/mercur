import crypto from "node:crypto"

import { IPromotionModuleService } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

const MAX_GENERATION_ATTEMPTS = 8
const CODE_SUFFIX_BYTES = 4

const generateCandidateSuffix = (): string =>
  crypto.randomBytes(CODE_SUFFIX_BYTES).toString("hex").toUpperCase()

/**
 * Draws one promotion code that neither an existing DB row nor an
 * already-reserved code from the same caller is using yet. The DB's
 * `IDX_unique_promotion_code` constraint (global, not seller-scoped —
 * see @medusajs/promotion's Promotion model) stays the real guarantee;
 * this check-then-reserve loop just keeps a normal request from ever
 * hitting that constraint in practice.
 */
export const generateUniquePromotionCode = async (
  promotionModule: IPromotionModuleService,
  prefix: string,
  reservedInBatch: Set<string> = new Set()
): Promise<string> => {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = `${prefix}-${generateCandidateSuffix()}`

    if (reservedInBatch.has(candidate)) {
      continue
    }

    const existing = await promotionModule.listPromotions(
      { code: candidate },
      { take: 1 }
    )

    if (existing.length === 0) {
      return candidate
    }
  }

  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "Failed to generate a unique promotion code after multiple attempts. Please try again."
  )
}

/**
 * True only when `code` is well-formed and not already taken — used to
 * decide whether a previewed (reserved) code can still be honored as-is
 * at actual creation time, instead of drawing a brand new one.
 */
export const isPromotionCodeAvailable = async (
  promotionModule: IPromotionModuleService,
  code: string
): Promise<boolean> => {
  const existing = await promotionModule.listPromotions({ code }, { take: 1 })

  return existing.length === 0
}
