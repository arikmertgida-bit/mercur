import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
  MiddlewareRoute,
} from "@medusajs/framework/http"
import { validateAndTransformQuery } from "@medusajs/framework"

import { getSellerVisibleProductIds } from "../products/helpers"
import { vendorProductVariantsQueryConfig } from "./query-config"
import { VendorGetProductVariantsParams } from "./validators"

const applySellerProductVariantFilter = async (
  req: AuthenticatedMedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const sellerId = req.seller_context!.seller_id

  const visibleProductIds = await getSellerVisibleProductIds(req.scope, sellerId)

  req.filterableFields ??= {}
  const existingAnd = (req.filterableFields.$and as object[] | undefined) ?? []
  req.filterableFields.$and = [
    ...existingAnd,
    { product_id: visibleProductIds },
  ]

  return next()
}

export const vendorProductVariantsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/vendor/product-variants",
    middlewares: [
      validateAndTransformQuery(
        VendorGetProductVariantsParams,
        vendorProductVariantsQueryConfig.list
      ),
      applySellerProductVariantFilter,
    ],
  },
]
