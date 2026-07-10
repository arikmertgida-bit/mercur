import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { WISHLIST_MODULE, WishlistModuleService } from "../../../../modules/wishlist"
import { adminDeleteWishlistWorkflow } from "../../../../workflows/wishlist/workflows/admin-delete-wishlist"

export type AdminDeleteWishlistResponse = {
  success: boolean
  deleted: boolean
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminDeleteWishlistResponse>
) => {
  const wishlistService = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE)
  const [wishlist] = await wishlistService.listWishlists({ id: req.params.id })
  if (!wishlist) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Wishlist with id ${req.params.id} was not found`
    )
  }

  await adminDeleteWishlistWorkflow(req.scope).run({
    input: { id: req.params.id },
  })

  res.json({ success: true, deleted: true })
}
