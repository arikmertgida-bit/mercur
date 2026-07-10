import { Module } from "@medusajs/framework/utils"
import ReviewImageService from "./service"

export const REVIEW_IMAGE_MODULE = "reviewImage"
export const REVIEW_MAX_IMAGES = 5

export default Module(REVIEW_IMAGE_MODULE, {
  service: ReviewImageService,
})
