import { MedusaError } from "@medusajs/framework/utils"

import { SellerContext } from "../../types/seller-context"

interface SellerScopedRequest {
  seller_context?: SellerContext
}

/**
 * Vendor routes run behind `ensureSellerMiddleware`, which sets the seller
 * context; reaching one without it means the route was mounted outside that
 * middleware, so the request is refused rather than served unscoped.
 */
export function requireSellerContext(req: SellerScopedRequest): SellerContext {
  const context = req.seller_context

  if (!context) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Seller context is required for this route"
    )
  }

  return context
}

export function getSellerId(req: SellerScopedRequest): string {
  return requireSellerContext(req).seller_id
}
