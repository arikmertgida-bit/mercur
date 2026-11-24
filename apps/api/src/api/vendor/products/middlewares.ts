import { MiddlewareRoute } from "@medusajs/medusa"
import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { SellerStatus } from "@mercurjs/types"
import type {} from "@mercurjs/core/types/seller-context"
import {
  SELLER_PENDING_APPROVAL_CODE,
  SELLER_SUSPENDED_CODE,
  SELLER_TERMINATED_CODE,
} from "@mercurjs/core/api/utils/vendor-error-codes"

import { csvUpload } from "../../../lib/file-validation"

export const productImportExportMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/vendor/products/import",
    middlewares: [csvUpload.single("file")],
  },
]

type InactiveSellerStatus = Exclude<SellerStatus, SellerStatus.OPEN>

const INACTIVE_SELLER_ERRORS: Record<
  InactiveSellerStatus,
  { code: string; message: string }
> = {
  [SellerStatus.PENDING_APPROVAL]: {
    code: SELLER_PENDING_APPROVAL_CODE,
    message:
      "Your store is awaiting operator approval; you cannot perform this action until it is approved.",
  },
  [SellerStatus.SUSPENDED]: {
    code: SELLER_SUSPENDED_CODE,
    message:
      "Your store has been suspended by the operator; you cannot perform this action.",
  },
  [SellerStatus.TERMINATED]: {
    code: SELLER_TERMINATED_CODE,
    message:
      "Your store has been permanently terminated by the operator; you cannot perform this action.",
  },
}

/**
 * Only an `open` store may create, edit or delete products. Every other
 * status has its own error code, so a store awaiting approval or a
 * terminated store is told what actually happened instead of "suspended".
 */
const requireActiveSellerMiddleware = (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
): void => {
  const sellerStatus = req.seller_context?.seller_member.seller.status

  if (sellerStatus !== undefined && sellerStatus !== SellerStatus.OPEN) {
    const { code, message } = INACTIVE_SELLER_ERRORS[sellerStatus]
    next(new MedusaError(MedusaError.Types.NOT_ALLOWED, message, code))
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
