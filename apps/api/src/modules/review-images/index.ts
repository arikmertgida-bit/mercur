import { Module } from "@medusajs/framework/utils"
import ReviewImageService from "./service"

export const REVIEW_IMAGE_MODULE = "reviewImage"
// Keep in sync with storefront/src/lib/reviews/constants.ts REVIEW_MAX_IMAGES.
export const REVIEW_MAX_IMAGES = 6

export default Module(REVIEW_IMAGE_MODULE, {
  service: ReviewImageService,
})
