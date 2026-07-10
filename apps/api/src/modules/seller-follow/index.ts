import { Module } from "@medusajs/framework/utils"

import SellerFollowerModuleService from "./service"

export const SELLER_FOLLOW_MODULE = "seller_follow"
export { SellerFollowerModuleService }

export default Module(SELLER_FOLLOW_MODULE, {
  service: SellerFollowerModuleService,
})
