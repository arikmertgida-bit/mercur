import { Modules } from "@medusajs/framework/utils"
import {
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { dismissRemoteLinkStep, useQueryGraphStep } from "@medusajs/medusa/core-flows"

import { WISHLIST_MODULE } from "../../../modules/wishlist"
import { deleteWishlistRecordStep } from "../steps/delete-wishlist-record"

export type AdminDeleteWishlistWorkflowInput = {
  id: string
}

export const adminDeleteWishlistWorkflow = createWorkflow(
  {
    name: "admin-delete-wishlist",
  },
  function (input: AdminDeleteWishlistWorkflowInput) {
    const { data: wishlists } = useQueryGraphStep({
      entity: "wishlist",
      fields: ["id", "customer.id", "products.id"],
      filters: { id: input.id },
    })

    const links = transform({ wishlists }, ({ wishlists }) => {
      const wishlist = wishlists[0]
      const linkEntries: Record<string, Record<string, string>>[] = []

      if (!wishlist) {
        return linkEntries
      }

      if (wishlist.customer?.id) {
        linkEntries.push({
          [Modules.CUSTOMER]: { customer_id: wishlist.customer.id },
          [WISHLIST_MODULE]: { wishlist_id: wishlist.id },
        })
      }

      for (const product of wishlist.products ?? []) {
        if (!product) {
          continue
        }
        linkEntries.push({
          [WISHLIST_MODULE]: { wishlist_id: wishlist.id },
          [Modules.PRODUCT]: { product_id: product.id },
        })
      }

      return linkEntries
    })

    dismissRemoteLinkStep(links)

    const result = deleteWishlistRecordStep({ id: input.id })

    return new WorkflowResponse(result)
  }
)
