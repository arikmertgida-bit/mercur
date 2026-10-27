import { requirePermission } from "../../utils"
import {
  AuthenticatedMedusaRequest,
  maybeApplyLinkFilter,
  MedusaNextFunction,
  MedusaResponse,
  MiddlewareRoute,
} from "@medusajs/framework/http"
import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"

import {
  OrderScopedFilterFields,
  validateSellerOrder,
} from "../orders/helpers"
import { vendorExchangeQueryConfig } from "./query-config"
import { validateSellerExchange } from "./helpers"
import {
  VendorGetExchangesParams,
  VendorPostCancelExchangeReq,
  VendorPostExchangesAddItemsReq,
  VendorPostExchangesItemsActionReq,
  VendorPostExchangesRequestItemsReturnActionReq,
  VendorPostExchangesReturnRequestItemsReq,
  VendorPostExchangesShippingActionReq,
  VendorPostExchangesShippingReq,
  VendorPostOrderExchangesReq,
} from "./validators"
import { getSellerId } from "../../utils/seller-context"

const assertSellerOwnsOrderInBody = async (
  req: AuthenticatedMedusaRequest<{ order_id: string }>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const sellerId = getSellerId(req)
  const orderId = req.validatedBody.order_id
  await validateSellerOrder(req.scope, sellerId, orderId)
  return next()
}

const assertSellerOwnsExchangeInParam = async (
  req: AuthenticatedMedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const sellerId = getSellerId(req)
  const { id } = req.params
  await validateSellerExchange(req.scope, sellerId, id)
  return next()
}

const applySellerExchangesFilter = async (
  req: AuthenticatedMedusaRequest<never, OrderScopedFilterFields>,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  if (req.filterableFields.order_id) {
    await validateSellerOrder(
      req.scope,
      getSellerId(req),
      req.filterableFields.order_id
    )
    return next()
  }

  req.filterableFields.seller_id = getSellerId(req)

  return maybeApplyLinkFilter({
    entryPoint: "order_seller",
    resourceId: "order_id",
    filterableField: "seller_id",
    filterByField: "order_id",
  })(req, res, next)
}

export const vendorExchangesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/vendor/exchanges",
    middlewares: [
      requirePermission("orders.returns", "view"),
      validateAndTransformQuery(
        VendorGetExchangesParams,
        vendorExchangeQueryConfig.list
      ),
      applySellerExchangesFilter,
    ],
  },
  {
    method: ["POST"],
    matcher: "/vendor/exchanges",
    middlewares: [
      requirePermission("orders.returns", "edit"),
      validateAndTransformBody(VendorPostOrderExchangesReq),
      assertSellerOwnsOrderInBody,
    ],
  },
  {
    method: ["POST"],
    matcher: "/vendor/exchanges/:id/cancel",
    middlewares: [
      requirePermission("orders.returns", "edit"),
      validateAndTransformBody(VendorPostCancelExchangeReq),
      assertSellerOwnsExchangeInParam,
    ],
  },
  {
    method: ["POST"],
    matcher: "/vendor/exchanges/:id/request",
    middlewares: [
      requirePermission("orders.returns", "edit"),
      assertSellerOwnsExchangeInParam],
  },
  {
    method: ["DELETE"],
    matcher: "/vendor/exchanges/:id/request",
    middlewares: [
      requirePermission("orders.returns", "manage"),
      assertSellerOwnsExchangeInParam],
  },
  {
    method: ["POST"],
    matcher: "/vendor/exchanges/:id/inbound/items",
    middlewares: [
      requirePermission("orders.returns", "edit"),
      validateAndTransformBody(VendorPostExchangesReturnRequestItemsReq),
      assertSellerOwnsExchangeInParam,
    ],
  },
  {
    method: ["POST"],
    matcher: "/vendor/exchanges/:id/inbound/items/:action_id",
    middlewares: [
      requirePermission("orders.returns", "edit"),
      validateAndTransformBody(VendorPostExchangesRequestItemsReturnActionReq),
      assertSellerOwnsExchangeInParam,
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/vendor/exchanges/:id/inbound/items/:action_id",
    middlewares: [
      requirePermission("orders.returns", "manage"),
      assertSellerOwnsExchangeInParam],
  },
  {
    method: ["POST"],
    matcher: "/vendor/exchanges/:id/inbound/shipping-method",
    middlewares: [
      requirePermission("orders.returns", "edit"),
      validateAndTransformBody(VendorPostExchangesShippingReq),
      assertSellerOwnsExchangeInParam,
    ],
  },
  {
    method: ["POST"],
    matcher: "/vendor/exchanges/:id/inbound/shipping-method/:action_id",
    middlewares: [
      requirePermission("orders.returns", "edit"),
      validateAndTransformBody(VendorPostExchangesShippingActionReq),
      assertSellerOwnsExchangeInParam,
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/vendor/exchanges/:id/inbound/shipping-method/:action_id",
    middlewares: [
      requirePermission("orders.returns", "manage"),
      assertSellerOwnsExchangeInParam],
  },
  {
    method: ["POST"],
    matcher: "/vendor/exchanges/:id/outbound/items",
    middlewares: [
      requirePermission("orders.returns", "edit"),
      validateAndTransformBody(VendorPostExchangesAddItemsReq),
      assertSellerOwnsExchangeInParam,
    ],
  },
  {
    method: ["POST"],
    matcher: "/vendor/exchanges/:id/outbound/items/:action_id",
    middlewares: [
      requirePermission("orders.returns", "edit"),
      validateAndTransformBody(VendorPostExchangesItemsActionReq),
      assertSellerOwnsExchangeInParam,
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/vendor/exchanges/:id/outbound/items/:action_id",
    middlewares: [
      requirePermission("orders.returns", "manage"),
      assertSellerOwnsExchangeInParam],
  },
  {
    method: ["POST"],
    matcher: "/vendor/exchanges/:id/outbound/shipping-method",
    middlewares: [
      requirePermission("orders.returns", "edit"),
      validateAndTransformBody(VendorPostExchangesShippingReq),
      assertSellerOwnsExchangeInParam,
    ],
  },
  {
    method: ["POST"],
    matcher: "/vendor/exchanges/:id/outbound/shipping-method/:action_id",
    middlewares: [
      requirePermission("orders.returns", "edit"),
      validateAndTransformBody(VendorPostExchangesShippingActionReq),
      assertSellerOwnsExchangeInParam,
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/vendor/exchanges/:id/outbound/shipping-method/:action_id",
    middlewares: [
      requirePermission("orders.returns", "manage"),
      assertSellerOwnsExchangeInParam],
  },
]
