import {
  validateAndTransformQuery,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MiddlewareRoute } from "@medusajs/medusa"
import { SellerStatus } from "@mercurjs/types"

import * as QueryConfig from "./query-config"
import { StoreGetSellersParams, StoreGetSellerParams } from "./validators"

function applySellerOpenFilters(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const now = new Date()

  req.filterableFields.status ??= SellerStatus.OPEN

  const and = (req.filterableFields.$and as object[] | undefined) ?? []
  and.push(
    { $or: [{ closed_from: null }, { closed_from: { $gt: now } }] },
    { $or: [{ closed_to: null }, { closed_to: { $lt: now } }] }
  )
  req.filterableFields.$and = and

  next()
}

export const storeSellersMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/sellers",
    middlewares: [
      validateAndTransformQuery(
        StoreGetSellersParams,
        QueryConfig.listSellerQueryConfig
      ),
      applySellerOpenFilters,
    ],
  },
  {
    method: ["GET"],
    matcher: "/store/sellers/:id",
    middlewares: [
      validateAndTransformQuery(
        StoreGetSellerParams,
        QueryConfig.retrieveSellerQueryConfig
      ),
      applySellerOpenFilters,
    ],
  },
]
