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
  id: z.string(),
  inventory_items: z
    .array(z.object({ inventory_item_id: z.string() }).nullable())
    .nullish(),
})

export type SellerProductVariantInput = {
  variant: Omit<CreateProductVariantDTO, "manage_inventory"> & {
    prices?: { amount: number; currency_code: string }[]
  }
  inventory: { location_id: string; quantity: number }[]
}

export type CreateSellerProductVariantWorkflowInput = {
  seller_id: string
  variants: SellerProductVariantInput[]
} & AdditionalData

export const createSellerProductVariantWorkflowId =
  "mercur-create-seller-product-variant"

/**
 * Adds variants to a seller's product from the admin side. Like a variant the
 * seller adds itself each one is always stock-tracked, its stock goes to the
 * seller's own locations and its inventory item belongs to the seller (the
 * vendor inventory view is scoped by that link).
 */
export const createSellerProductVariantWorkflow = createWorkflow(
  createSellerProductVariantWorkflowId,
  (
    input: WorkflowData<CreateSellerProductVariantWorkflowInput>
  ): WorkflowResponse<{ ids: string[] }> => {
    const created = createProductVariantsWorkflow.runAsStep({
      input: transform({ input }, ({ input }) => ({
        product_variants: input.variants.map(({ variant }) => ({
          ...variant,
          manage_inventory: true,
        })),
        additional_data: input.additional_data,
      })),
    })

    const variantIds = transform({ created }, ({ created }) =>
      created.map((variant) => variant.id)
    )

    const { data: variantRows } = useQueryGraphStep({
      entity: "product_variant",
      fields: ["id", "inventory_items.inventory_item_id"],
      filters: transform({ variantIds }, ({ variantIds }) => ({
        id: variantIds,
      })),
    }).config({ name: "mercur-seller-variant-inventory-items" })

    const stock = transform(
      { input, variantIds, variantRows },
      ({ input, variantIds, variantRows }) => {
        const itemsByVariant = new Map(
          parseGraphRows(VariantInventoryRowSchema, variantRows).map((row) => [
            row.id,
            (row.inventory_items ?? []).flatMap((item) =>
              item ? [item.inventory_item_id] : []
            ),
          ])
        )
        const links: { inventory_item_id: string; seller_id: string }[] = []
        const levels: {
          inventory_item_id: string
          location_id: string
          stocked_quantity: number
        }[] = []
        variantIds.forEach((variantId, index) => {
          const itemIds = itemsByVariant.get(variantId) ?? []
          for (const inventory_item_id of itemIds) {
            links.push({ inventory_item_id, seller_id: input.seller_id })
          }
          const [inventoryItemId] = itemIds
          if (!inventoryItemId) {
            return
          }
          for (const entry of input.variants[index]?.inventory ?? []) {
            levels.push({
              inventory_item_id: inventoryItemId,
              location_id: entry.location_id,
              stocked_quantity: entry.quantity,
            })
          }
        })
        return { links, levels }
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
      transform({ variantIds }, ({ variantIds }) => ({ ids: variantIds }))
    )
  }
)
