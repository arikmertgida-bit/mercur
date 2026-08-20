import { Module } from "@medusajs/framework/utils"
import ReviewReplyImageService from "./service"

export const REVIEW_REPLY_IMAGE_MODULE = "reviewReplyImage"
export const REVIEW_REPLY_MAX_IMAGES = 4

export default Module(REVIEW_REPLY_IMAGE_MODULE, {
  service: ReviewReplyImageService,
})
