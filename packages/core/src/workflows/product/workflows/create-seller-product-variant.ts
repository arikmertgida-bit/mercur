import {
  createWorkflow,
  transform,
  when,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  AdditionalData,
  CreateProductVariantDTO,
} from "@medusajs/framework/types"
import {
  createInventoryLevelsWorkflow,
  createProductVariantsWorkflow,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import { z } from "zod"

import { associateSellersWithInventoryItemStep } from "../../inventory-item/steps"
import { parseGraphRows } from "../../../utils/graph-rows"

const VariantInventoryRowSchema = z.object({
  inventory_items: z
    .array(z.object({ inventory_item_id: z.string() }).nullable())
    .nullish(),
})

export type CreateSellerProductVariantWorkflowInput = {
  seller_id: string
  variant: Omit<CreateProductVariantDTO, "manage_inventory"> & {
    prices?: { amount: number; currency_code: string }[]
  }
  inventory: { location_id: string; quantity: number }[]
} & AdditionalData

export const createSellerProductVariantWorkflowId =
  "mercur-create-seller-product-variant"

/**
 * Adds a variant to a seller's product from the admin side. Like a variant the
 * seller adds itself it is always stock-tracked, its stock goes to the
 * seller's own locations and its inventory item belongs to the seller (the
 * vendor inventory view is scoped by that link).
 */
export const createSellerProductVariantWorkflow = createWorkflow(
  createSellerProductVariantWorkflowId,
  (
    input: WorkflowData<CreateSellerProductVariantWorkflowInput>
  ): WorkflowResponse<{ id: string }> => {
    const created = createProductVariantsWorkflow.runAsStep({
      input: transform({ input }, ({ input }) => ({
        product_variants: [{ ...input.variant, manage_inventory: true }],
        additional_data: input.additional_data,
      })),
    })

    const variantId = transform({ created }, ({ created }) => created[0].id)

    const { data: variantRows } = useQueryGraphStep({
      entity: "product_variant",
      fields: ["inventory_items.inventory_item_id"],
      filters: transform({ variantId }, ({ variantId }) => ({ id: variantId })),
    }).config({ name: "mercur-seller-variant-inventory-items" })

    const stock = transform(
      { input, variantRows },
      ({ input, variantRows }) => {
        const inventoryItemIds = parseGraphRows(
          VariantInventoryRowSchema,
          variantRows
        ).flatMap((row) =>
          (row.inventory_items ?? []).flatMap((item) =>
            item ? [item.inventory_item_id] : []
          )
        )
        const [inventoryItemId] = inventoryItemIds
        return {
          links: inventoryItemIds.map((inventory_item_id) => ({
            inventory_item_id,
            seller_id: input.seller_id,
          })),
          levels: inventoryItemId
            ? input.inventory.map((entry) => ({
                inventory_item_id: inventoryItemId,
                location_id: entry.location_id,
                stocked_quantity: entry.quantity,
              }))
            : [],
        }
      }
    )

    when({ stock }, ({ stock }) => stock.levels.length > 0).then(() =>
      createInventoryLevelsWorkflow.runAsStep({
        input: transform({ stock }, ({ stock }) => ({
          inventory_levels: stock.levels,
        })),
      })
    )

    associateSellersWithInventoryItemStep({ links: stock.links })

    return new WorkflowResponse(
      transform({ variantId }, ({ variantId }) => ({ id: variantId }))
    )
  }
)
