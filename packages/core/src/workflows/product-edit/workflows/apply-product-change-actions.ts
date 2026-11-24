import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
  type ReturnWorkflow,
} from "@medusajs/framework/workflows-sdk"
import {
  createInventoryLevelsWorkflow,
  createProductVariantsWorkflow,
  deleteProductsWorkflow,
  deleteProductVariantsWorkflow,
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import {
  ProductAttributeBatchAdd,
  ProductAttributeBatchUpdate,
  ProductChangeActionType,
} from "@mercurjs/types"
import { z } from "zod"

import {
  applyVariantImageLinksStep,
  updateProductChangeActionsStep,
  type VariantImageLinks,
} from "../steps"
import { associateSellersWithInventoryItemStep } from "../../inventory-item/steps"
import { applyProductAttributeChangeActionsWorkflow } from "./apply-product-attribute-change-actions"
import { parseGraphRow, parseGraphRows } from "../../../utils/graph-rows"
import { JsonSnapshot } from "../../../utils/json-schema"
import {
  AttributeAddDetailsSchema,
  AttributeRemoveDetailsSchema,
  AttributeUpdateDetailsSchema,
  ChangeActionRowSchema,
  FieldUpdateDetailsSchema,
  StagedProductUpdateSchema,
  StagedVariantCreateSchema,
  StagedVariantUpdateSchema,
  StatusChangeDetailsSchema,
  VariantAddDetailsSchema,
  VariantImagesSchema,
  VariantRemoveDetailsSchema,
  VariantUpdateDetailsSchema,
} from "../utils/action-details"

const CreatedVariantInventoryRowSchema = z.object({
  id: z.string(),
  inventory_items: z
    .array(z.object({ inventory_item_id: z.string() }))
    .nullish(),
})

const ProductSellerRowSchema = z.object({
  product_id: z.string(),
  seller_id: z.string(),
})

export type ApplyProductChangeActionsWorkflowInput = {
  change_ids: string[]
}

type BucketedActions = {
  productUpdates: z.infer<typeof StagedProductUpdateSchema>[]
  variantCreates: z.infer<typeof StagedVariantCreateSchema>[]
  variantUpdates: z.infer<typeof StagedVariantUpdateSchema>[]
  variantImageLinks: VariantImageLinks[]
  variantDeletes: string[]
  attributeBatch: {
    product_id: string
    add: ProductAttributeBatchAdd[]
    remove: string[]
    update: ProductAttributeBatchUpdate[]
  } | null
  productsToDelete: string[]
  pendingActionIds: string[]
}

const HANDLED_ACTION_TYPES = new Set<string>([
  ProductChangeActionType.STATUS_CHANGE,
  ProductChangeActionType.UPDATE,
  ProductChangeActionType.VARIANT_ADD,
  ProductChangeActionType.VARIANT_UPDATE,
  ProductChangeActionType.VARIANT_REMOVE,
  ProductChangeActionType.ATTRIBUTE_ADD,
  ProductChangeActionType.ATTRIBUTE_REMOVE,
  ProductChangeActionType.ATTRIBUTE_UPDATE,
  ProductChangeActionType.PRODUCT_DELETE,
])

export const applyProductChangeActionsWorkflowId =
  "apply-product-change-actions"

export const applyProductChangeActionsWorkflow: ReturnWorkflow<
  ApplyProductChangeActionsWorkflowInput,
  void,
  []
> = createWorkflow(
  applyProductChangeActionsWorkflowId,
  function (input: ApplyProductChangeActionsWorkflowInput) {
    const { data: actions } = useQueryGraphStep({
      entity: "product_change_action",
      fields: ["id", "product_id", "action", "details", "applied"],
      filters: {
        product_change_id: input.change_ids,
        applied: false,
      },
    }).config({ name: "pc-load-pending-actions" })

    const buckets = transform({ actions }, ({ actions }): BucketedActions => {
      const productUpdatesById = new Map<string, JsonSnapshot & { id: string }>()
      const variantCreates: BucketedActions["variantCreates"] = []
      const variantUpdates: BucketedActions["variantUpdates"] = []
      const variantImageLinks: VariantImageLinks[] = []
      const variantDeletes: string[] = []
      let attributeBatch: BucketedActions["attributeBatch"] = null
      const ensureAttributeBatch = (productId: string) => {
        attributeBatch ??= {
          product_id: productId,
          add: [],
          remove: [],
          update: [],
        }
        return attributeBatch
      }
      const productsToDelete = new Set<string>()
      const pendingActionIds: string[] = []

      for (const action of parseGraphRows(ChangeActionRowSchema, actions)) {
        if (action.applied) continue
        // Types this workflow cannot act on keep `applied: false` — stamping
        // them would assert an application that never happened.
        if (!HANDLED_ACTION_TYPES.has(action.action)) continue
        pendingActionIds.push(action.id)

        const productId = action.product_id
        const details = action.details ?? {}

        switch (action.action) {
          case ProductChangeActionType.STATUS_CHANGE: {
            const { status } = StatusChangeDetailsSchema.parse(details)
            if (status === undefined) break
            const u = productUpdatesById.get(productId) ?? { id: productId }
            u.status = status
            productUpdatesById.set(productId, u)
            break
          }
          case ProductChangeActionType.UPDATE: {
            const { field, value } = FieldUpdateDetailsSchema.parse(details)
            if (!field) break
            const u = productUpdatesById.get(productId) ?? { id: productId }
            u[field] = value
            productUpdatesById.set(productId, u)
            break
          }
          case ProductChangeActionType.VARIANT_ADD: {
            const { variant } = VariantAddDetailsSchema.parse(details)
            if (!variant) break
            variantCreates.push(
              parseGraphRow(StagedVariantCreateSchema, {
                ...variant,
                product_id: productId,
              }),
            )
            break
          }
          case ProductChangeActionType.VARIANT_UPDATE: {
            const { variant_id, fields } =
              VariantUpdateDetailsSchema.parse(details)
            if (!variant_id || !fields || !Object.keys(fields).length) break
            const { images: rawImages, ...scalarFields } = fields
            const images = VariantImagesSchema.optional().parse(rawImages)
            const add = images?.add ?? []
            const remove = images?.remove ?? []
            if (add.length || remove.length) {
              variantImageLinks.push({ variant_id, add, remove })
            }
            if (Object.keys(scalarFields).length) {
              variantUpdates.push(
                parseGraphRow(StagedVariantUpdateSchema, {
                  ...scalarFields,
                  id: variant_id,
                }),
              )
            }
            break
          }
          case ProductChangeActionType.VARIANT_REMOVE: {
            const { variant_id: variantId } =
              VariantRemoveDetailsSchema.parse(details)
            if (variantId) variantDeletes.push(variantId)
            break
          }
          case ProductChangeActionType.ATTRIBUTE_ADD: {
            const { attribute } = AttributeAddDetailsSchema.parse(details)
            if (!attribute) break
            ensureAttributeBatch(productId).add.push(attribute)
            break
          }
          case ProductChangeActionType.ATTRIBUTE_REMOVE: {
            const { attribute_id: attributeId } =
              AttributeRemoveDetailsSchema.parse(details)
            if (!attributeId) break
            ensureAttributeBatch(productId).remove.push(attributeId)
            break
          }
          case ProductChangeActionType.ATTRIBUTE_UPDATE: {
            const { update } = AttributeUpdateDetailsSchema.parse(details)
            if (!update) break
            ensureAttributeBatch(productId).update.push(update)
            break
          }
          case ProductChangeActionType.PRODUCT_DELETE: {
            productsToDelete.add(productId)
            break
          }
        }
      }

      return {
        productUpdates: Array.from(productUpdatesById.values())
          .filter((u) => Object.keys(u).length > 1)
          .map((u) => parseGraphRow(StagedProductUpdateSchema, u)),
        variantCreates,
        variantUpdates,
        variantImageLinks,
        variantDeletes,
        attributeBatch,
        productsToDelete: Array.from(productsToDelete),
        pendingActionIds,
      }
    })

    when({ buckets }, ({ buckets }) => buckets.productUpdates.length > 0).then(
      () => {
        updateProductsWorkflow.runAsStep({
          input: transform({ buckets }, ({ buckets }) => ({
            products: buckets.productUpdates,
          })),
        })
      },
    )

    when({ buckets }, ({ buckets }) => buckets.variantDeletes.length > 0).then(
      () => {
        deleteProductVariantsWorkflow.runAsStep({
          input: transform({ buckets }, ({ buckets }) => ({
            ids: buckets.variantDeletes,
          })),
        })
      },
    )

    // `inventory` is not a variant field: it stocks the inventory item Medusa
    // creates for the tracked variant, below.
    const createdVariants = when(
      { buckets },
      ({ buckets }) => buckets.variantCreates.length > 0,
    ).then(() =>
      createProductVariantsWorkflow.runAsStep({
        input: transform({ buckets }, ({ buckets }) => ({
          product_variants: buckets.variantCreates.map(
            ({ inventory: _inventory, ...variant }) => variant,
          ),
        })),
      }),
    )

    const createdVariantStock = when(
      { buckets },
      ({ buckets }) => buckets.variantCreates.length > 0,
    ).then(() => {
      const createdVariantIds = transform(
        { createdVariants },
        ({ createdVariants }) =>
          (createdVariants ?? []).map((variant) => variant.id),
      )

      const { data: createdVariantRows } = useQueryGraphStep({
        entity: "product_variant",
        fields: ["id", "inventory_items.inventory_item_id"],
        filters: { id: createdVariantIds },
      }).config({ name: "pc-load-created-variant-inventory-items" })

      const variantProductIds = transform({ buckets }, ({ buckets }) =>
        Array.from(new Set(buckets.variantCreates.map((v) => v.product_id))),
      )

      const { data: productSellerRows } = useQueryGraphStep({
        entity: "product_seller",
        fields: ["product_id", "seller_id"],
        filters: { product_id: variantProductIds },
      }).config({ name: "pc-load-created-variant-sellers" })

      return transform(
        { buckets, createdVariants, createdVariantRows, productSellerRows },
        ({ buckets, createdVariants, createdVariantRows, productSellerRows }) => {
          const inventoryItemByVariantId = new Map<string, string>()
          for (const row of parseGraphRows(
            CreatedVariantInventoryRowSchema,
            createdVariantRows,
          )) {
            const inventoryItemId = row.inventory_items?.[0]?.inventory_item_id
            if (inventoryItemId) {
              inventoryItemByVariantId.set(row.id, inventoryItemId)
            }
          }

          const sellerIdsByProductId = new Map<string, string[]>()
          for (const row of parseGraphRows(
            ProductSellerRowSchema,
            productSellerRows,
          )) {
            const sellerIds = sellerIdsByProductId.get(row.product_id) ?? []
            sellerIds.push(row.seller_id)
            sellerIdsByProductId.set(row.product_id, sellerIds)
          }

          const levels: {
            inventory_item_id: string
            location_id: string
            stocked_quantity: number
          }[] = []
          const sellerLinks: { inventory_item_id: string; seller_id: string }[] =
            []

          // createProductVariantsWorkflow returns variants in input order.
          buckets.variantCreates.forEach((input, index) => {
            const variantId = createdVariants?.[index]?.id
            const inventoryItemId = variantId
              ? inventoryItemByVariantId.get(variantId)
              : undefined
            if (!inventoryItemId) return

            for (const level of input.inventory ?? []) {
              levels.push({
                inventory_item_id: inventoryItemId,
                location_id: level.location_id,
                stocked_quantity: level.quantity,
              })
            }
            for (const seller_id of sellerIdsByProductId.get(input.product_id) ??
              []) {
              sellerLinks.push({ inventory_item_id: inventoryItemId, seller_id })
            }
          })

          return { levels, sellerLinks }
        },
      )
    })

    when(
      { createdVariantStock },
      ({ createdVariantStock }) =>
        (createdVariantStock?.levels.length ?? 0) > 0,
    ).then(() =>
      createInventoryLevelsWorkflow.runAsStep({
        input: transform({ createdVariantStock }, ({ createdVariantStock }) => ({
          inventory_levels: createdVariantStock?.levels ?? [],
        })),
      }),
    )

    when(
      { createdVariantStock },
      ({ createdVariantStock }) =>
        (createdVariantStock?.sellerLinks.length ?? 0) > 0,
    ).then(() =>
      associateSellersWithInventoryItemStep(
        transform({ createdVariantStock }, ({ createdVariantStock }) => ({
          links: createdVariantStock?.sellerLinks ?? [],
        })),
      ).config({ name: "pc-associate-sellers-variant-inventory-items" }),
    )

    when({ buckets }, ({ buckets }) => buckets.variantUpdates.length > 0).then(
      () => {
        updateProductVariantsWorkflow.runAsStep({
          input: transform({ buckets }, ({ buckets }) => ({
            product_variants: buckets.variantUpdates,
          })),
        })
      },
    )

    when(
      { buckets },
      ({ buckets }) => buckets.variantImageLinks.length > 0,
    ).then(() => {
      applyVariantImageLinksStep({
        updates: transform(
          { buckets },
          ({ buckets }) => buckets.variantImageLinks,
        ),
      })
    })

    applyProductAttributeChangeActionsWorkflow.runAsStep({
      input: transform({ buckets }, ({ buckets }) => ({
        product_id: buckets.attributeBatch?.product_id ?? "",
        add: buckets.attributeBatch?.add ?? [],
        remove: buckets.attributeBatch?.remove ?? [],
        update: buckets.attributeBatch?.update ?? [],
      })),
    })

    when(
      { buckets },
      ({ buckets }) => buckets.productsToDelete.length > 0,
    ).then(() => {
      deleteProductsWorkflow.runAsStep({
        input: transform({ buckets }, ({ buckets }) => ({
          ids: buckets.productsToDelete,
        })),
      })
    })

    when(
      { buckets },
      ({ buckets }) => buckets.pendingActionIds.length > 0,
    ).then(() => {
      updateProductChangeActionsStep(
        transform({ buckets }, ({ buckets }) =>
          buckets.pendingActionIds.map((id) => ({ id, applied: true })),
        ),
      )
    })

    return new WorkflowResponse(void 0)
  },
)
