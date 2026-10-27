import { AdditionalData } from "@medusajs/framework/types"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
  type ReturnWorkflow,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import {
  CreateProductChangeActionDTO,
  type JsonRecord,
  ProductChangeActionType,
  ProductChangeDTO,
  JsonValue,
} from "@mercurjs/types"

import {
  isJsonObject,
  type JsonSnapshot,
  JsonSnapshotSchema,
  toJsonRecord,
} from "../../../utils/json-schema"

import {
  validateNoPendingProductChangeStep,
  validateVariantsBelongToProductStep,
} from "../steps"
import { stageProductChangeWorkflow } from "./stage-product-change"

export type ProductEditVariantAddOperation = {
  type: "add"
  variant: JsonSnapshot
}

export type ProductEditVariantUpdateOperation = {
  type: "update"
  variant_id: string
  fields: JsonSnapshot
}

export type ProductEditVariantRemoveOperation = {
  type: "remove"
  variant_id: string
}

export type ProductEditVariantOperation =
  | ProductEditVariantAddOperation
  | ProductEditVariantUpdateOperation
  | ProductEditVariantRemoveOperation

export type ProductEditUpdateVariantsWorkflowInput = {
  product_id: string
  created_by?: string
  operations: ProductEditVariantOperation[]
} & AdditionalData

export const productEditUpdateVariantsWorkflowId =
  "product-edit-update-variants"

const NON_EDITABLE_VARIANT_FIELDS = new Set(["manage_inventory"])

export const productEditUpdateVariantsWorkflow: ReturnWorkflow<
  ProductEditUpdateVariantsWorkflowInput,
  ProductChangeDTO,
  []
> = createWorkflow(
  productEditUpdateVariantsWorkflowId,
  function (input: ProductEditUpdateVariantsWorkflowInput) {
    validateNoPendingProductChangeStep(
      transform({ input }, ({ input }) => ({
        product_ids: [input.product_id],
        created_by: input.created_by,
      })),
    )

    const variantIdsToLoad = transform({ input }, ({ input }) =>
      Array.from(
        new Set(
          (input.operations ?? [])
            .filter(
              (op): op is ProductEditVariantUpdateOperation =>
                op.type === "update",
            )
            .map((op) => op.variant_id),
        ),
      ),
    )

    const variantIdsToValidate = transform({ input }, ({ input }) =>
      Array.from(
        new Set(
          (input.operations ?? [])
            .filter(
              (
                op,
              ): op is
                | ProductEditVariantUpdateOperation
                | ProductEditVariantRemoveOperation =>
                op.type === "update" || op.type === "remove",
            )
            .map((op) => op.variant_id),
        ),
      ),
    )

    validateVariantsBelongToProductStep(
      transform({ input, variantIdsToValidate }, ({ input, variantIdsToValidate }) => ({
        product_id: input.product_id,
        variant_ids: variantIdsToValidate,
      })),
    )

    const { data: currentVariants } = useQueryGraphStep({
      entity: "variant",
      fields: [
        "id",
        "title",
        "sku",
        "ean",
        "upc",
        "isbn",
        "barcode",
        "hs_code",
        "mid_code",
        "manage_inventory",
        "allow_backorder",
        "weight",
        "length",
        "height",
        "width",
        "origin_country",
        "material",
        "variant_rank",
        "metadata",
        "options.value",
        "options.option.title",
      ],
      filters: { id: variantIdsToLoad, product_id: input.product_id },
    }).config({ name: "pc-load-variants-for-diff" })

    const actions = transform(
      { input, currentVariants },
      ({ input, currentVariants }) => {
        const acts: Array<
          Omit<CreateProductChangeActionDTO, "product_change_id">
        > = []

        const currentVariantsById = new Map<string, JsonSnapshot>()
        for (const variant of currentVariants ?? []) {
          currentVariantsById.set(
            variant.id,
            JsonSnapshotSchema.parse(variant),
          )
        }

        const normalize = (value: JsonValue | undefined): JsonValue => {
          if (Array.isArray(value)) {
            return value
              .map((item): JsonValue => {
                if (isJsonObject(item) && "id" in item) {
                  return item.id
                }
                if (isJsonObject(item) && "url" in item) {
                  return item.url
                }
                return item
              })
              .sort()
          }
          return value ?? null
        }

        const isEqual = (a: JsonValue | undefined, b: JsonValue | undefined): boolean =>
          JSON.stringify(normalize(a)) === JSON.stringify(normalize(b))

        const toOptionsMap = (value: JsonValue | undefined): Record<string, string> => {
          const out: Record<string, string> = {}
          if (Array.isArray(value)) {
            for (const entry of value) {
              if (!isJsonObject(entry)) continue
              const option = entry.option
              const title = isJsonObject(option) ? option.title : undefined
              if (title) {
                out[String(title)] = String(entry.value ?? "")
              }
            }
          } else if (isJsonObject(value)) {
            for (const [k, v] of Object.entries(value)) {
              out[k] = String(v ?? "")
            }
          }
          return out
        }

        const optionsEqual = (
          a: Record<string, string>,
          b: Record<string, string>,
        ): boolean => {
          const stable = (m: Record<string, string>) =>
            JSON.stringify(
              Object.keys(m)
                .sort()
                .map((k) => [k, m[k]]),
            )
          return stable(a) === stable(b)
        }

        for (const op of input.operations ?? []) {
          switch (op.type) {
            case "add":
              acts.push({
                product_id: input.product_id,
                action: ProductChangeActionType.VARIANT_ADD,
                details: { variant: toJsonRecord(op.variant) },
              })
              break
            case "update": {
              const current = currentVariantsById.get(op.variant_id) ?? {}
              const changedFields: JsonSnapshot = {}
              const previousFields: JsonRecord = {}
              for (const [field, proposedValue] of Object.entries(
                op.fields ?? {},
              )) {
                if (NON_EDITABLE_VARIANT_FIELDS.has(field)) continue

                if (field === "options") {
                  if (proposedValue === undefined) continue
                  const currentOptions = toOptionsMap(current.options)
                  if (optionsEqual(currentOptions, toOptionsMap(proposedValue)))
                    continue
                  changedFields.options = proposedValue
                  previousFields.options = currentOptions
                  continue
                }

                if (field === "images") {
                  if (proposedValue !== undefined) {
                    changedFields.images = proposedValue
                  }
                  continue
                }

                if (isEqual(current[field], proposedValue)) continue

                changedFields[field] = proposedValue
                previousFields[field] = current[field] ?? null
              }

              if (!Object.keys(changedFields).length) break

              acts.push({
                product_id: input.product_id,
                action: ProductChangeActionType.VARIANT_UPDATE,
                details: {
                  variant_id: op.variant_id,
                  fields: toJsonRecord(changedFields),
                  previous_fields: previousFields,
                },
              })
              break
            }
            case "remove":
              acts.push({
                product_id: input.product_id,
                action: ProductChangeActionType.VARIANT_REMOVE,
                details: { variant_id: op.variant_id },
              })
              break
          }
        }

        return acts
      },
    )

    const change = stageProductChangeWorkflow.runAsStep({
      input: transform({ input, actions }, ({ input, actions }) => ({
        product_id: input.product_id,
        created_by: input.created_by,
        actions,
      })),
    })

    return new WorkflowResponse(change)
  },
)
