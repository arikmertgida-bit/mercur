import { requirePermission } from "../../utils"
import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
  MiddlewareRoute,
} from "@medusajs/framework/http"
import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"

import {
  adminProductQueryConfig,
  adminProductVariantQueryConfig,
} from "./query-config"
import {
  AdminBatchProductAttributes,
  AdminBatchProductVariants,
  AdminBatchProducts,
  AdminChangeProductSeller,
  AdminCreateProduct,
  AdminCreateProductVariant,
  AdminGetProductParams,
  AdminGetProductsParams,
  AdminGetProductVariantParams,
  AdminGetProductVariantsParams,
  AdminConfirmProduct,
  AdminRejectProduct,
  AdminRequestProductChanges,
  AdminUpdateProduct,
  AdminUpdateProductVariant,
} from "./validators"
import { MedusaError } from "@medusajs/framework/utils"
import { withOriginalMiddlewares } from "../../../utils/disable-medusa-middlewares"
import {
  ensureBatchShippingProfilesOfSeller,
  ensureProductShippingProfileOfSeller,
} from "./seller-guards"
import {
  ensureVariantInventoryItemInStore,
  ensureVariantInventoryItemsBatchInStore,
} from "../inventory-items/seller-guards"

// Medusa's admin CSV import creates products without a store; sellers import
// their own products through /vendor/products/import instead.
const CLOSED_IMPORT_MATCHERS = [
  "/admin/products/import",
  "/admin/products/imports",
  "/admin/products/import/:transaction_id/confirm",
  "/admin/products/imports/:transaction_id/confirm",
]

const rejectClosedRoute = (
  _req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => next(new MedusaError(MedusaError.Types.NOT_FOUND, "Route not found"))

const overrides: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/products",
    middlewares: [
      requirePermission("products", "view"),
      validateAndTransformQuery(
        AdminGetProductsParams,
        adminProductQueryConfig.list
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/products",
    middlewares: [
      requirePermission("products", "edit"),
      validateAndTransformBody(AdminCreateProduct),
      validateAndTransformQuery(
        AdminGetProductParams,
        adminProductQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/products/batch",
    middlewares: [
      requirePermission("products", "edit"),
      validateAndTransformBody(AdminBatchProducts),
      validateAndTransformQuery(
        AdminGetProductsParams,
        adminProductQueryConfig.list
      ),
      ensureBatchShippingProfilesOfSeller,
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/products/:id",
    middlewares: [
      requirePermission("products", "view"),
      validateAndTransformQuery(
        AdminGetProductParams,
        adminProductQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/products/:id",
    middlewares: [
      requirePermission("products", "edit"),
      validateAndTransformBody(AdminUpdateProduct),
      validateAndTransformQuery(
        AdminGetProductParams,
        adminProductQueryConfig.retrieve
      ),
      ensureProductShippingProfileOfSeller,
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/admin/products/:id",
    middlewares: [
      requirePermission("products", "manage"),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/products/:id/confirm",
    middlewares: [
      requirePermission("products.review", "edit"),
      validateAndTransformBody(AdminConfirmProduct),
      validateAndTransformQuery(
        AdminGetProductParams,
        adminProductQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/products/:id/request-changes",
    middlewares: [
      requirePermission("products.review", "edit"),
      validateAndTransformBody(AdminRequestProductChanges),
      validateAndTransformQuery(
        AdminGetProductParams,
        adminProductQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/products/:id/reject",
    middlewares: [
      requirePermission("products.review", "edit"),
      validateAndTransformBody(AdminRejectProduct),
      validateAndTransformQuery(
        AdminGetProductParams,
        adminProductQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/products/:id/variants",
    middlewares: [
      requirePermission("products", "view"),
      validateAndTransformQuery(
        AdminGetProductVariantsParams,
        adminProductVariantQueryConfig.list
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/products/:id/variants",
    middlewares: [
      requirePermission("products", "edit"),
      validateAndTransformBody(AdminCreateProductVariant),
      validateAndTransformQuery(
        AdminGetProductParams,
        adminProductQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/products/:id/variants/batch",
    middlewares: [
      requirePermission("products", "edit"),
      validateAndTransformBody(AdminBatchProductVariants),
      validateAndTransformQuery(
        AdminGetProductVariantParams,
        adminProductVariantQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/products/:id/variants/:variant_id",
    middlewares: [
      requirePermission("products", "view"),
      validateAndTransformQuery(
        AdminGetProductVariantParams,
        adminProductVariantQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/products/:id/variants/:variant_id",
    middlewares: [
      requirePermission("products", "edit"),
      validateAndTransformBody(AdminUpdateProductVariant),
      validateAndTransformQuery(
        AdminGetProductParams,
        adminProductQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/admin/products/:id/variants/:variant_id",
    middlewares: [
      requirePermission("products", "manage"),
      validateAndTransformQuery(
        AdminGetProductParams,
        adminProductQueryConfig.retrieve
      ),
    ],
  },

  {
    method: ["POST"],
    matcher: "/admin/products/:id/attributes/batch",
    middlewares: [
      requirePermission("products", "edit"),
      validateAndTransformBody(AdminBatchProductAttributes),
      validateAndTransformQuery(
        AdminGetProductParams,
        adminProductQueryConfig.retrieve
      ),
    ],
  },

  {
    method: ["POST"],
    matcher: "/admin/products/:id/seller",
    middlewares: [
      requirePermission("products", "edit"),
      validateAndTransformBody(AdminChangeProductSeller),
      validateAndTransformQuery(
        AdminGetProductParams,
        adminProductQueryConfig.retrieve
      ),
    ],
  },
  ...CLOSED_IMPORT_MATCHERS.map(
    (matcher): MiddlewareRoute => ({
      method: ["POST"],
      matcher,
      middlewares: [rejectClosedRoute],
    })
  ),
]

// Run after Medusa's own body validation for these native routes; adding
// them to `overrides` would replace that validation.
const nativeRouteGuards: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/products/:id/variants/inventory-items/batch",
    middlewares: [ensureVariantInventoryItemsBatchInStore],
  },
  {
    method: ["POST"],
    matcher: "/admin/products/:id/variants/:variant_id/inventory-items",
    middlewares: [ensureVariantInventoryItemInStore],
  },
]

export const adminProductsMiddlewares: MiddlewareRoute[] = [
  ...withOriginalMiddlewares("dist/api/admin/products/middlewares.js", overrides),
  ...nativeRouteGuards,
]
