import { Module } from "@medusajs/framework/utils"

import ReviewSocialModuleService from "./service"

export const REVIEW_SOCIAL_MODULE = "review_social"

export { ReviewSocialModuleService }

export default Module(REVIEW_SOCIAL_MODULE, {
  service: ReviewSocialModuleService,
})
