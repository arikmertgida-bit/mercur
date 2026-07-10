import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"

import SellerFollowModule from "../modules/seller-follow"

export default defineLink(CustomerModule.linkable.customer, {
  linkable: SellerFollowModule.linkable.sellerFollower,
  deleteCascade: true,
  isList: true,
})
