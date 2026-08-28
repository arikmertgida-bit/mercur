import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
  MiddlewareRoute,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"
import type { StorePostReturnsReqSchemaType } from "@medusajs/medusa/api/store/returns/validators"

import { isReturnWindowOpen } from "../../../lib/return-window"

/**
 * Turkish Law No. 6502 gives shoppers a 14-day withdrawal window from
 * delivery. The storefront already hides the return button/page past that
 * date, but a saved link or a direct API call could still reach this
 * route — this middleware is the actual enforcement, since client-side
 * hiding alone cannot stop a request sent straight to the API. Runs after
 * the core `/store/returns` body validator (registered by
 * `@medusajs/medusa`), which already populates `req.validatedBody`.
 */
const enforceReturnWindow = async (
  req: MedusaRequest<StorePostReturnsReqSchemaType>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const { order_id: orderId } = req.validatedBody
  if (!orderId) {
    next()
    return
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: ["id", "fulfillments.delivered_at", "fulfillments.canceled_at"],
    filters: { id: orderId },
  })

  if (!order || isReturnWindowOpen(order.fulfillments ?? [])) {
    next()
    return
  }

  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    `Return window has closed for order ${orderId} (14-day limit under Turkish Law No. 6502).`
  )
}

export const storeReturnsReturnWindowMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/returns",
    middlewares: [enforceReturnWindow],
  },
]
