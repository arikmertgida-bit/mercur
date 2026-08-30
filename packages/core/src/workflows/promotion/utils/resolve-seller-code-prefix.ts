import { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { MercurModules } from "@mercurjs/types"

import SellerModuleService from "../../../modules/seller/service"
import { buildPromotionCodePrefix } from "./build-promotion-code-prefix"

export const resolveSellerCodePrefix = async (
  container: MedusaContainer,
  sellerId: string
): Promise<string> => {
  const sellerService = container.resolve<SellerModuleService>(MercurModules.SELLER)

  const [seller] = await sellerService.listSellers({ id: sellerId })

  if (!seller) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Seller with id: ${sellerId} was not found`
    )
  }

  return buildPromotionCodePrefix(seller.handle, seller.id)
}
