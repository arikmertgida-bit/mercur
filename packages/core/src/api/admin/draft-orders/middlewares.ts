import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
  MiddlewareRoute,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

// Medusa's draft orders become orders without the seller split: no seller
// link, order group, commission lines or payout, and one draft can mix stores.
// Kayı takes orders only through the storefront checkout. Medusa's own
// draft-order middlewares are emptied (utils/disable-medusa-middlewares.ts) so
// this answers first on every method, before any body validation.
const CLOSED_DRAFT_ORDER_MATCHERS = ["/admin/draft-orders", "/admin/draft-orders/*"]

const rejectClosedRoute = (
  _req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
): void => next(new MedusaError(MedusaError.Types.NOT_FOUND, "Route not found"))

export const adminDraftOrdersMiddlewares: MiddlewareRoute[] =
  CLOSED_DRAFT_ORDER_MATCHERS.map(
    (matcher): MiddlewareRoute => ({
      method: ["GET", "POST", "DELETE"],
      matcher,
      middlewares: [rejectClosedRoute],
    })
  )
