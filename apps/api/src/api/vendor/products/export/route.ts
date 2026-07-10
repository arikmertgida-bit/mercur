import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type {} from "@mercurjs/core/types/seller-context"
import { exportSellerProductsWorkflow } from "../../../../workflows/product-import-export/workflows/export-seller-products"
import { fetchSellerByAuthActorId } from "../helpers"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<{ url: string }>
) => {
  if (!req.seller_context?.seller_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Authenticated seller not found"
    )
  }

  const seller = await fetchSellerByAuthActorId(
    req.seller_context.seller_id,
    req.scope
  )

  if (!seller) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Seller not found for the current user."
    )
  }

  const { result } = await exportSellerProductsWorkflow(req.scope).run({
    input: {
      seller_id: seller.id,
    },
  })

  res.json(result)
}
