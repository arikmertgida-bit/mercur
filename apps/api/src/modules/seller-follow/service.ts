import { MedusaService } from "@medusajs/framework/utils"

import { SellerFollower } from "./models/seller-follower"

class SellerFollowerModuleService extends MedusaService({
  SellerFollower,
}) {}

export default SellerFollowerModuleService
