import {
  validateAndTransformQuery,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
  type MiddlewareRoute,
} from "@medusajs/framework/http"
import {
  listTransformQueryConfig,
  retrieveTransformQueryConfig,
} from "@medusajs/medusa/api/store/orders/query-config"
import {
  StoreGetOrderParams,
  StoreGetOrdersParams,
} from "@medusajs/medusa/api/store/orders/validators"

// Medusa's core /store/orders query config lets only literal field paths
// through and knows nothing about the order→seller, order→review,
// order-group and cart links, so they were silently dropped from the
// response. Only the fields the storefront renders are granted — never
// `*seller`, which would hand every seller column to the shopper.
const STORE_ORDER_RETURN_FIELDS = [
  "returns.id",
  "returns.status",
  "returns.created_at",
  "returns.requested_at",
  "returns.received_at",
  "returns.canceled_at",
  "returns.items",
]

export const STORE_ORDER_LIST_LINK_FIELDS = [
  "seller.id",
  "seller.name",
  "seller.handle",
  "seller.logo",
  "reviews.id",
  "reviews.reference_id",
  "reviews.rating",
  "reviews.customer_note",
  "reviews.created_at",
  ...STORE_ORDER_RETURN_FIELDS,
]

export const STORE_ORDER_RETRIEVE_LINK_FIELDS = [
  "seller.id",
  "seller.name",
  "seller.handle",
  "seller.logo",
  "seller.email",
  "seller.address.address_1",
  "seller.address.city",
  "seller.address.postal_code",
  "seller.address.country_code",
  "order_group.id",
  "cart.id",
  ...STORE_ORDER_RETURN_FIELDS,
]

export const grantLinkFields = (allowed: string[], fields: string[]): void => {
  for (const field of fields) {
    if (!allowed.includes(field)) {
      allowed.push(field)
    }
  }
}

const allowLinkFields =
  (fields: string[]) =>
  (req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction): void => {
    grantLinkFields(req.allowed, fields)
    next()
  }

// Project middlewares run after the core route's own query validation, so
// the grant only takes effect when that validation runs again with it.
export const storeOrdersLinkFieldsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/orders",
    middlewares: [
      allowLinkFields(STORE_ORDER_LIST_LINK_FIELDS),
      validateAndTransformQuery(StoreGetOrdersParams, listTransformQueryConfig),
    ],
  },
  {
    method: ["GET"],
    matcher: "/store/orders/:id",
    middlewares: [
      allowLinkFields(STORE_ORDER_RETRIEVE_LINK_FIELDS),
      validateAndTransformQuery(StoreGetOrderParams, retrieveTransformQueryConfig),
    ],
  },
]
