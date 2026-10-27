import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { CommissionLineDTO } from "@mercurjs/types"

import { getOrderCommissionLines } from "../../../../utils/order-commission-lines"
import { getSellerId } from "../../../../utils/seller-context"

export type VendorOrderCommissionLinesResponse = {
  commission_lines: CommissionLineDTO[]
  count: number
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<VendorOrderCommissionLinesResponse>
) => {
  const sellerId = getSellerId(req)

  const { found, commission_lines } = await getOrderCommissionLines(
    req.scope,
    req.params.id,
    sellerId
  )

  if (!found) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order with id ${req.params.id} was not found`
    )
  }

  res.json({
    commission_lines,
    count: commission_lines.length,
  })
}
