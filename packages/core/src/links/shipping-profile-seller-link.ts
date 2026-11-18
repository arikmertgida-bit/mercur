import { defineLink } from "@medusajs/framework/utils"
import FulfillmentModule from "@medusajs/medusa/fulfillment"
import SellerModule from "../modules/seller"

/**
 * Kayı keeps shipping profiles seller-owned (upstream made them a shared
 * operator catalog in #1498): a seller sees and uses only the profiles it
 * created, so one store can never attach products or shipping options to
 * another store's profile. The link table already existed from before that
 * change, so the existing seller profiles keep their owner.
 */
export default defineLink(
  { linkable: FulfillmentModule.linkable.shippingProfile, isList: true },
  SellerModule.linkable.seller
)
