import { defineLink } from "@medusajs/framework/utils"
import SellerModule from "@mercurjs/core/modules/seller"

import SellerFollowModule from "../modules/seller-follow"

export default defineLink(SellerModule.linkable.seller, {
  linkable: SellerFollowModule.linkable.sellerFollower,
  deleteCascade: true,
  isList: true,
})
