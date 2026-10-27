import { requirePermission } from "../../utils"
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
import { getSellerId } from "../../utils/seller-context"
import { AndQueryFilter } from "../../../utils/query-filter"

const applySellerProductVariantFilter = async (
  req: AuthenticatedMedusaRequest<never, AndQueryFilter>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const sellerId = getSellerId(req)

  const visibleProductIds = await getSellerVisibleProductIds(req.scope, sellerId)

  req.filterableFields ??= {}
  const existingAnd = req.filterableFields.$and ?? []
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
      requirePermission("products", "view"),
      validateAndTransformQuery(
        VendorGetProductVariantsParams,
        vendorProductVariantsQueryConfig.list
      ),
      applySellerProductVariantFilter,
    ],
  },
]
