import {
  createWorkflow,
  transform,
  when,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  deleteInventoryLevelsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"

import {
  associateSellersWithInventoryItemStep,
  detachSellersFromInventoryItemStep,
} from "../../inventory-item/steps"
import {
  associateSellersWithProductStep,
  detachSellersFromProductStep,
} from "../steps"
import { validateProductSellerChangeStep } from "../steps/validate-product-seller-change"

export type ChangeProductSellerWorkflowInput = {
  product_id: string
  seller_id: string
  shipping_profile_id: string
}

export const changeProductSellerWorkflowId = "mercur-change-product-seller"

/**
 * Moves a product to another seller. The new seller ships it with one of its
 * own shipping profiles; the stock levels in the old seller's warehouses are
 * deleted (the new seller enters its own stock) and the inventory items follow
 * the product. Past orders stay with the old seller.
 */
export const changeProductSellerWorkflow = createWorkflow(
  changeProductSellerWorkflowId,
  (
    input: WorkflowData<ChangeProductSellerWorkflowInput>
  ): WorkflowResponse<{ id: string }> => {
    const validated = validateProductSellerChangeStep(input)

    const productLinks = transform({ input, validated }, ({ input, validated }) => ({
      remove: validated.previous_seller_ids.map((seller_id) => ({
        product_id: input.product_id,
        seller_id,
      })),
      add: [{ product_id: input.product_id, seller_id: input.seller_id }],
    }))

    const inventoryItemLinks = transform(
      { input, validated },
      ({ input, validated }) => ({
        remove: validated.inventory_item_ids.flatMap((inventory_item_id) =>
          validated.previous_seller_ids.map((seller_id) => ({
            inventory_item_id,
            seller_id,
          }))
        ),
        add: validated.inventory_item_ids.map((inventory_item_id) => ({
          inventory_item_id,
          seller_id: input.seller_id,
        })),
      })
    )

    detachSellersFromProductStep({ links: productLinks.remove })
    associateSellersWithProductStep({ links: productLinks.add })

    detachSellersFromInventoryItemStep({ links: inventoryItemLinks.remove })
    associateSellersWithInventoryItemStep({ links: inventoryItemLinks.add })

    when({ validated }, ({ validated }) => validated.inventory_item_ids.length > 0).then(
      () => {
        deleteInventoryLevelsWorkflow.runAsStep({
          input: transform({ validated }, ({ validated }) => ({
            inventory_item_id: validated.inventory_item_ids,
            force: true,
          })),
        })
      }
    )

    updateProductsWorkflow.runAsStep({
      input: transform({ input }, ({ input }) => ({
        selector: { id: input.product_id },
        update: { shipping_profile_id: input.shipping_profile_id },
      })),
    })

    return new WorkflowResponse(
      transform({ input }, ({ input }) => ({ id: input.product_id }))
    )
  }
)
