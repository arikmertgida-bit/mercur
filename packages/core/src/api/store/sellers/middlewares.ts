import {
  validateAndTransformQuery,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MiddlewareRoute } from "@medusajs/medusa"
import { SellerStatus } from "@mercurjs/types"

import { QueryFilter } from "../../../utils/query-filter"
import { buildSellerOutsideClosureWindowFilter } from "../../utils/sellers"
import * as QueryConfig from "./query-config"
import { StoreGetSellersParams, StoreGetSellerParams } from "./validators"

/**
 * A `handle` filter means the caller already knows exactly which seller it
 * wants (the storefront's own public store page, reached by handle) rather
 * than browsing/searching the marketplace — that single-entity lookup must
 * see the seller's real status and closure window regardless of state, so
 * the storefront can render a dedicated closure/suspension notice instead
 * of treating an unavailable seller as if it never existed. General listing
 * (no handle filter — homepage, search, category pages) keeps hiding
 * anything that isn't open and outside its closure window.
 */
type SellerListFilterFields = QueryFilter & {
  handle?: string
  status?: string | string[]
  $and?: QueryFilter[]
}

function applySellerOpenFilters(
  req: MedusaRequest<never, SellerListFilterFields>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  if (typeof req.filterableFields.handle === "string") {
    next()
    return
  }

  const now = new Date()

  req.filterableFields.status ??= SellerStatus.OPEN

  const and = req.filterableFields.$and ?? []
  and.push(buildSellerOutsideClosureWindowFilter(now))
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
