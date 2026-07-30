import { MiddlewareRoute } from "@medusajs/medusa"
import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { SellerStatus } from "@mercurjs/types"
import type {} from "@mercurjs/core/types/seller-context"
import multer from "multer"

const upload = multer({ storage: multer.memoryStorage() })

export const productImportExportMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/vendor/products/import",
    middlewares: [upload.single("file")],
  },
]

/**
 * A store that is suspended (`suspended`), awaiting approval
 * (`pending_approval`), or terminated (`terminated`) cannot create, edit,
 * or delete products — only sellers in the `open` state may pass through
 * these endpoints. The restriction holds until an admin sets the store back
 * to `open`.
 */
const requireActiveSellerMiddleware = (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
): void => {
  const sellerStatus = req.seller_context?.seller_member.seller.status

  if (sellerStatus !== undefined && sellerStatus !== SellerStatus.OPEN) {
    next(
      new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Your store has been suspended by the operator; you cannot perform this action."
      )
    )
    return
  }

  next()
}

export const vendorProductActiveSellerMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/vendor/products",
    middlewares: [requireActiveSellerMiddleware],
  },
  {
    method: ["POST", "DELETE"],
    matcher: "/vendor/products/:id",
    middlewares: [requireActiveSellerMiddleware],
  },
]
