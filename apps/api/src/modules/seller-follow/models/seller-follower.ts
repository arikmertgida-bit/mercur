import { model } from "@medusajs/framework/utils"

export const SellerFollower = model.define("seller_follower", {
  id: model.id({ prefix: "selfol" }).primaryKey(),
})
