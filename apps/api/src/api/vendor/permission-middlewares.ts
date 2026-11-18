import type { MiddlewareRoute } from "@medusajs/framework/http"
import { requirePermission } from "@mercurjs/core/api/utils/permissions-middleware"

import { KAYI_VENDOR_PERMISSION } from "../../permissions"

/**
 * Member-role gates for Kayı's own /vendor routes. Core's /vendor/* catch-all
 * resolves the member's rights first; these entries only check them. Every
 * authenticated route under api/vendor must appear here (locked by
 * __tests__/vendor-route-permissions.unit.spec.ts).
 */
export const vendorRoutePermissionMiddlewares: MiddlewareRoute[] = [
  { method: ["GET"], matcher: "/vendor/auth/messenger-token", middlewares: [requirePermission(KAYI_VENDOR_PERMISSION.MESSAGES, "view")] },
  { method: ["GET"], matcher: "/vendor/support/admin-contact", middlewares: [requirePermission(KAYI_VENDOR_PERMISSION.MESSAGES, "view")] },
  { method: ["GET"], matcher: "/vendor/customers/:id/avatar", middlewares: [requirePermission("customers", "view")] },
  { method: ["GET"], matcher: "/vendor/dashboard", middlewares: [requirePermission(KAYI_VENDOR_PERMISSION.DASHBOARD, "view")] },
  { method: ["GET"], matcher: "/vendor/followers", middlewares: [requirePermission(KAYI_VENDOR_PERMISSION.FOLLOWERS, "view")] },
  { method: ["GET"], matcher: "/vendor/member-permission-areas", middlewares: [requirePermission("members", "view")] },
  { method: ["GET"], matcher: "/vendor/notification-preferences", middlewares: [requirePermission("store", "view")] },
  { method: ["POST"], matcher: "/vendor/notification-preferences", middlewares: [requirePermission("store", "edit")] },
  { method: ["POST"], matcher: "/vendor/products/export", middlewares: [requirePermission("products", "view")] },
  { method: ["POST"], matcher: "/vendor/products/import", middlewares: [requirePermission("products", "edit")] },
  { method: ["GET"], matcher: "/vendor/requests/product-categories", middlewares: [requirePermission("product_categories", "view")] },
  { method: ["POST"], matcher: "/vendor/requests/product-categories", middlewares: [requirePermission("product_categories", "edit")] },
  { method: ["GET"], matcher: "/vendor/requests/product-collections", middlewares: [requirePermission("product_collections", "view")] },
  { method: ["POST"], matcher: "/vendor/requests/product-collections", middlewares: [requirePermission("product_collections", "edit")] },
  { method: ["GET"], matcher: "/vendor/requests/product-types", middlewares: [requirePermission("product_types", "view")] },
  { method: ["POST"], matcher: "/vendor/requests/product-types", middlewares: [requirePermission("product_types", "edit")] },
  { method: ["GET"], matcher: "/vendor/requests/product-tags", middlewares: [requirePermission("product_tags", "view")] },
  { method: ["POST"], matcher: "/vendor/requests/product-tags", middlewares: [requirePermission("product_tags", "edit")] },
  { method: ["GET"], matcher: "/vendor/requests/return-reasons", middlewares: [requirePermission("return_reasons", "view")] },
  { method: ["POST"], matcher: "/vendor/requests/return-reasons", middlewares: [requirePermission("return_reasons", "edit")] },
  { method: ["GET"], matcher: "/vendor/reviews", middlewares: [requirePermission(KAYI_VENDOR_PERMISSION.REVIEWS, "view")] },
  { method: ["GET"], matcher: "/vendor/reviews/stats", middlewares: [requirePermission(KAYI_VENDOR_PERMISSION.REVIEWS, "view")] },
  { method: ["GET"], matcher: "/vendor/reviews/:id", middlewares: [requirePermission(KAYI_VENDOR_PERMISSION.REVIEWS, "view")] },
  { method: ["POST"], matcher: "/vendor/reviews/:id", middlewares: [requirePermission(KAYI_VENDOR_PERMISSION.REVIEWS, "edit")] },
  { method: ["GET"], matcher: "/vendor/reviews/:id/replies", middlewares: [requirePermission(KAYI_VENDOR_PERMISSION.REVIEWS, "view")] },
  { method: ["GET"], matcher: "/vendor/review-reports", middlewares: [requirePermission(KAYI_VENDOR_PERMISSION.REVIEWS, "view")] },
  { method: ["POST"], matcher: "/vendor/review-reports", middlewares: [requirePermission(KAYI_VENDOR_PERMISSION.REVIEWS, "edit")] },
]
