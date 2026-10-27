import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
  type ReturnWorkflow,
} from "@medusajs/framework/workflows-sdk"
import {
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

    when({ buckets }, ({ buckets }) => buckets.variantCreates.length > 0).then(
      () => {
        createProductVariantsWorkflow.runAsStep({
          input: transform({ buckets }, ({ buckets }) => ({
            product_variants: buckets.variantCreates,
          })),
        })
      },
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
