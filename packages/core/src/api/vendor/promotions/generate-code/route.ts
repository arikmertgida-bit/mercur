import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { IPromotionModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

import {
  generateUniquePromotionCode,
  issueCodeReservationToken,
  resolveSellerCodePrefix,
} from "../../../../workflows/promotion/utils"

type GenerateVendorPromotionCodeResponse = {
  code: string
  code_reservation_token: string
}

/**
 * Lets the vendor UI show the seller a real, system-generated promotion
 * code before they save — nothing is persisted here, so an abandoned
 * create form simply leaves no trace. The returned token is what carries
 * this exact code through to POST /vendor/promotions if the seller does
 * save; it expires on its own (see code-reservation-token) if they don't.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<GenerateVendorPromotionCodeResponse>
) => {
  const sellerId = req.seller_context!.seller_id

  const promotionModule = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

  const prefix = await resolveSellerCodePrefix(req.scope, sellerId)
  const code = await generateUniquePromotionCode(promotionModule, prefix)

  const codeReservationToken = issueCodeReservationToken(req.scope, {
    seller_id: sellerId,
    code,
  })

  res.json({ code, code_reservation_token: codeReservationToken })
}
