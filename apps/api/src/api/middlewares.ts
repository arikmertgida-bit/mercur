import { defineMiddlewares } from "@medusajs/medusa";
import { errorHandler as defaultErrorHandler } from "@medusajs/framework/http";
import type { MedusaErrorHandlerFunction } from "@medusajs/framework/http";

import { adminProductReportsMiddlewares } from "./admin/product-reports/middlewares";
import { storeProductReportsMiddlewares } from "./store/product-reports/middlewares";
import { adminReviewsMiddlewares } from "./admin/reviews/middlewares";
import { vendorReviewsMiddlewares } from "./vendor/reviews/middlewares";
import { storeReviewMiddlewares } from "./store/reviews/middlewares";
import { storeReviewLikeMiddlewares } from "./store/reviews/[id]/like/middlewares";
import { storeReviewRepliesMiddlewares } from "./store/review-replies/middlewares";
import { storeProductReviewsMiddlewares } from "./store/product-reviews/middlewares";
import { adminReviewImageReportsMiddlewares } from "./admin/review-image-reports/middlewares";
import { vendorReviewReportsMiddlewares } from "./vendor/review-reports/middlewares";
import { adminReviewReportsMiddlewares } from "./admin/review-reports/middlewares";
import { storeReviewImagesMiddlewares } from "./store/review-images/middlewares";
import { storeMessengerTokenMiddlewares } from "./store/auth/messenger-token/middlewares";
import { productImportExportMiddlewares, vendorProductActiveSellerMiddlewares } from "./vendor/products/middlewares";
import { adminRequestsMiddlewares } from "./admin/requests/middlewares";
import { vendorProductCollectionRequestsMiddlewares } from "./vendor/requests/product-collections/middlewares";
import { vendorProductCategoryRequestsMiddlewares } from "./vendor/requests/product-categories/middlewares";
import { vendorProductTypeRequestsMiddlewares } from "./vendor/requests/product-types/middlewares";
import { vendorProductTagRequestsMiddlewares } from "./vendor/requests/product-tags/middlewares";
import { vendorReturnReasonRequestsMiddlewares } from "./vendor/requests/return-reasons/middlewares";
import { storeWishlistMiddlewares } from "./store/wishlist/middlewares";
import { adminWishlistMiddlewares } from "./admin/wishlist/middlewares";
import { storeCustomerUploadMiddlewares } from "./store/customer/upload/middlewares";
import { storeSellerFollowMiddlewares } from "./store/sellers/[handle]/follow/middlewares";
import { storeSellersFollowingMiddlewares } from "./store/sellers-following/middlewares";
import { storeCatalogProductsMiddlewares } from "./store/catalog/products/middlewares";
import { storeSellerProductsMiddlewares } from "./store/sellers/[handle]/products/middlewares";
import { storeSearchSuggestMiddlewares } from "./store/search/suggest/middlewares";
import { storeCampaignsMiddlewares } from "./store/campaigns/middlewares";
import { storeReturnsReturnWindowMiddlewares } from "./store/returns/middlewares";
import { vendorFollowersMiddlewares } from "./vendor/followers/middlewares";
import { vendorAwareErrorHandler } from "../lib/vendor-error-i18n";
import { adminAwareErrorHandler } from "../lib/admin-error-i18n";
import { storeAwareErrorHandler } from "../lib/store-error-i18n";

const fallbackErrorHandler = defaultErrorHandler();

/**
 * Dispatches to the vendor-, admin-, or store-aware translator by path
 * prefix, since `defineMiddlewares` only accepts a single `errorHandler`.
 * Each translator already falls back to `defaultErrorHandler` internally
 * for its own "en" case; anything outside all three prefixes goes straight
 * to the default handler here.
 */
const scopedErrorHandler: MedusaErrorHandlerFunction = (error, req, res, next) => {
    if (req.path.startsWith("/vendor")) {
        vendorAwareErrorHandler(error, req, res, next);
        return;
    }
    if (req.path.startsWith("/admin")) {
        adminAwareErrorHandler(error, req, res, next);
        return;
    }
    if (req.path.startsWith("/store")) {
        storeAwareErrorHandler(error, req, res, next);
        return;
    }
    fallbackErrorHandler(error, req, res, next);
};

export default defineMiddlewares({
    errorHandler: scopedErrorHandler,
    routes: [
        ...storeWishlistMiddlewares,
        ...adminWishlistMiddlewares,
        ...storeCustomerUploadMiddlewares,
        ...storeSellerFollowMiddlewares,
        ...storeSellersFollowingMiddlewares,
        ...vendorFollowersMiddlewares,
        ...storeCatalogProductsMiddlewares,
        ...storeSellerProductsMiddlewares,
        ...storeSearchSuggestMiddlewares,
        ...storeCampaignsMiddlewares,
        ...storeReturnsReturnWindowMiddlewares,
        ...adminProductReportsMiddlewares,
        ...storeProductReportsMiddlewares,
        ...adminReviewsMiddlewares,
        ...vendorReviewsMiddlewares,
        ...storeReviewMiddlewares,
        ...storeReviewLikeMiddlewares,
        ...storeReviewRepliesMiddlewares,
        ...storeProductReviewsMiddlewares,
        ...adminReviewImageReportsMiddlewares,
        ...vendorReviewReportsMiddlewares,
        ...adminReviewReportsMiddlewares,
        ...storeReviewImagesMiddlewares,
        ...storeMessengerTokenMiddlewares,
        ...productImportExportMiddlewares,
        ...vendorProductActiveSellerMiddlewares,
        ...adminRequestsMiddlewares,
        ...vendorProductCollectionRequestsMiddlewares,
        ...vendorProductCategoryRequestsMiddlewares,
        ...vendorProductTypeRequestsMiddlewares,
        ...vendorProductTagRequestsMiddlewares,
        ...vendorReturnReasonRequestsMiddlewares,
    ],
});