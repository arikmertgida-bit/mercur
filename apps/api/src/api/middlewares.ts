import { defineMiddlewares } from "@medusajs/medusa";

import { adminProductReportsMiddlewares } from "./admin/product-reports/middlewares";
import { storeProductReportsMiddlewares } from "./store/product-reports/middlewares";
import { adminReviewsMiddlewares } from "./admin/reviews/middlewares";
import { vendorReviewsMiddlewares } from "./vendor/reviews/middlewares";
import { storeReviewMiddlewares } from "./store/reviews/middlewares";
import { storeProductReviewsMiddlewares } from "./store/product-reviews/middlewares";
import { adminReviewImageReportsMiddlewares } from "./admin/review-image-reports/middlewares";
import { storeReviewImagesMiddlewares } from "./store/review-images/middlewares";
import { storeMessengerTokenMiddlewares } from "./store/auth/messenger-token/middlewares";
import { productImportExportMiddlewares } from "./vendor/products/middlewares";
import { adminRequestsMiddlewares } from "./admin/requests/middlewares";
import { vendorProductCollectionRequestsMiddlewares } from "./vendor/requests/product-collections/middlewares";
import { vendorProductCategoryRequestsMiddlewares } from "./vendor/requests/product-categories/middlewares";
import { vendorProductTypeRequestsMiddlewares } from "./vendor/requests/product-types/middlewares";
import { vendorProductTagRequestsMiddlewares } from "./vendor/requests/product-tags/middlewares";
import { storeWishlistMiddlewares } from "./store/wishlist/middlewares";
import { adminWishlistMiddlewares } from "./admin/wishlist/middlewares";
import { storeCustomerUploadMiddlewares } from "./store/customer/upload/middlewares";
import { storeSellerFollowMiddlewares } from "./store/sellers/[handle]/follow/middlewares";
import { storeSellersFollowingMiddlewares } from "./store/sellers-following/middlewares";
import { storeCatalogProductsMiddlewares } from "./store/catalog/products/middlewares";
import { storeSellerProductsMiddlewares } from "./store/sellers/[handle]/products/middlewares";
import { storeSearchSuggestMiddlewares } from "./store/search/suggest/middlewares";

export default defineMiddlewares({
    routes: [
        ...storeWishlistMiddlewares,
        ...adminWishlistMiddlewares,
        ...storeCustomerUploadMiddlewares,
        ...storeSellerFollowMiddlewares,
        ...storeSellersFollowingMiddlewares,
        ...storeCatalogProductsMiddlewares,
        ...storeSellerProductsMiddlewares,
        ...storeSearchSuggestMiddlewares,
        ...adminProductReportsMiddlewares,
        ...storeProductReportsMiddlewares,
        ...adminReviewsMiddlewares,
        ...vendorReviewsMiddlewares,
        ...storeReviewMiddlewares,
        ...storeProductReviewsMiddlewares,
        ...adminReviewImageReportsMiddlewares,
        ...storeReviewImagesMiddlewares,
        ...storeMessengerTokenMiddlewares,
        ...productImportExportMiddlewares,
        ...adminRequestsMiddlewares,
        ...vendorProductCollectionRequestsMiddlewares,
        ...vendorProductCategoryRequestsMiddlewares,
        ...vendorProductTypeRequestsMiddlewares,
        ...vendorProductTagRequestsMiddlewares,
    ],
});