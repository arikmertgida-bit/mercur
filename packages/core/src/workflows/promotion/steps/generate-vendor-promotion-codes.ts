import { IPromotionModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  generateUniquePromotionCode,
  isPromotionCodeAvailable,
  resolveSellerCodePrefix,
} from "../utils"

type GenerateVendorPromotionCodesStepInput = {
  seller_id: string
  count: number
  preferredCode?: string | null
}

type GenerateVendorPromotionCodesStepOutput = {
  codes: string[]
}

/**
 * Generates the `code` for every promotion a seller is about to create.
 * The vendor never supplies a code (see VendorCreatePromotion, which has
 * no `code` field) — this is the only place a vendor-facing promotion
 * code is produced, so a seller can never pick, predict, or collide with
 * another seller's code.
 *
 * `preferredCode`, when given, is a code this same server already
 * generated and handed to the vendor as a live preview (see the
 * generate-code preview route + code-reservation-token) — honored as-is
 * for the first promotion in the batch as long as it's still free;
 * otherwise (or when absent) a fresh code is drawn exactly as before.
 */
export const generateVendorPromotionCodesStep = createStep(
  "generate-vendor-promotion-codes",
  async (
    input: GenerateVendorPromotionCodesStepInput,
    { container }
  ): Promise<StepResponse<GenerateVendorPromotionCodesStepOutput>> => {
    if (input.count === 0) {
      return new StepResponse({ codes: [] })
    }

    const promotionModule = container.resolve<IPromotionModuleService>(
      Modules.PROMOTION
    )

    const prefix = await resolveSellerCodePrefix(container, input.seller_id)
    const reservedInBatch = new Set<string>()
    const codes: string[] = []

    for (let i = 0; i < input.count; i++) {
      if (
        i === 0 &&
        input.preferredCode &&
        (await isPromotionCodeAvailable(promotionModule, input.preferredCode))
      ) {
        reservedInBatch.add(input.preferredCode)
        codes.push(input.preferredCode)
        continue
      }

      const code = await generateUniquePromotionCode(
        promotionModule,
        prefix,
        reservedInBatch
      )
      reservedInBatch.add(code)
      codes.push(code)
    }

    return new StepResponse({ codes })
  }
)
