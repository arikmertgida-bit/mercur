import "multer"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type {} from "@mercurjs/core/types/seller-context"
import { importSellerProductsWorkflow } from "../../../../workflows/product-import-export/workflows/import-seller-products"
import { fetchSellerByAuthActorId } from "../helpers"

type ImportProductsRequest = AuthenticatedMedusaRequest & {
  file?: Express.Multer.File
}

export const POST = async (
  req: ImportProductsRequest,
  res: MedusaResponse<{ summary: { created: number } }>
) => {
  const { file } = req

  if (!file) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No file uploaded. Please upload a CSV file."
    )
  }

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

  const fileContent = file.buffer.toString("utf-8")

  const { result } = await importSellerProductsWorkflow(req.scope).run({
    input: {
      file_content: fileContent,
      seller_id: seller.id,
    },
  })

  res.status(200).json({
    summary: {
      created: Array.isArray(result) ? result.length : 0,
    },
  })
}
