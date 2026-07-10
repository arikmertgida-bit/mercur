import { Modules } from "@medusajs/framework/utils"
import {
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"

import { CreateWishlistDTO, WISHLIST_MODULE } from "../../../modules/wishlist"
import { findOrCreateWishlistStep } from "../steps/find-or-create-wishlist"

export const createWishlistEntryWorkflow = createWorkflow(
  {
    name: "create-wishlist",
  },
  function (input: CreateWishlistDTO) {
    const wishlist = findOrCreateWishlistStep({
      customer_id: input.customer_id,
      reference: input.reference,
    })

    const links = transform({ input, wishlist }, ({ input, wishlist }) => {
      const productLink = {
        [WISHLIST_MODULE]: {
          wishlist_id: wishlist.id,
        },
        [Modules.PRODUCT]: {
          product_id: input.reference_id,
        },
      }

      if (!wishlist.created) {
        return [productLink]
      }

      return [
        {
          [Modules.CUSTOMER]: {
            customer_id: input.customer_id,
          },
          [WISHLIST_MODULE]: {
            wishlist_id: wishlist.id,
          },
        },
        productLink,
      ]
    })

    createRemoteLinkStep(links)

    return new WorkflowResponse(wishlist)
  }
)
