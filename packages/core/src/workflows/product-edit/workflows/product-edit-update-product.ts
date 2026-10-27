import { AdditionalData } from "@medusajs/framework/types"
import { deepEqualObj } from "@medusajs/framework/utils"
import {
  createHook,
  createWorkflow,
  type Hook,
  type ReturnWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import {
  CreateProductChangeActionDTO,
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

import { validateNoPendingProductChangeStep } from "../steps"
import { stageProductChangeWorkflow } from "./stage-product-change"

export type ProductEditUpdateProductWorkflowInput = {
  product_id: string
  created_by?: string
  update: JsonSnapshot
} & AdditionalData

export type ProductEditUpdateProductWorkflowHooks = [
  Hook<"validate", { input: ProductEditUpdateProductWorkflowInput }, void>,
  Hook<
    "productChangeCreated",
    {
      product_change: ProductChangeDTO
      additional_data: AdditionalData["additional_data"]
    },
    void
  >,
]

const DIFFABLE_FIELDS = [
  "title",
  "subtitle",
  "handle",
  "description",
  "discountable",
  "is_giftcard",
  "thumbnail",
  "images",
  "material",
  "weight",
  "length",
  "height",
  "width",
  "hs_code",
  "mid_code",
  "origin_country",
  "type_id",
  "collection_id",
  "categories",
  "tags",
  "sales_channels",
  "shipping_profile_id",
  "metadata",
] as const

export const productEditUpdateProductWorkflowId = "product-edit-update-product"

export const productEditUpdateProductWorkflow: ReturnWorkflow<
  ProductEditUpdateProductWorkflowInput,
  ProductChangeDTO,
  ProductEditUpdateProductWorkflowHooks
> = createWorkflow(
  productEditUpdateProductWorkflowId,
  function (input: ProductEditUpdateProductWorkflowInput) {
    const validate = createHook("validate", { input })

    validateNoPendingProductChangeStep(
      transform({ input }, ({ input }) => ({
        product_ids: [input.product_id],
        created_by: input.created_by,
      })),
    )

    const { data: currentProducts } = useQueryGraphStep({
      entity: "product",
      fields: [
        "id",
        "title",
        "subtitle",
        "handle",
        "description",
        "status",
        "discountable",
        "is_giftcard",
        "thumbnail",
        "material",
        "weight",
        "length",
        "height",
        "width",
        "hs_code",
        "mid_code",
        "origin_country",
        "type_id",
        "collection_id",
        "metadata",
        "images.url",
        "categories.id",
        "tags.id",
        "sales_channels.id",
      ],
      filters: transform({ input }, ({ input }) => ({ id: input.product_id })),
    }).config({ name: "load-current-product-for-diff" })

    const actions = transform(
      { input, currentProducts },
      ({ input, currentProducts }) => {
        const current = JsonSnapshotSchema.parse(currentProducts?.[0] ?? {})
        const proposed = input.update ?? {}

        // Unwrap relation/image arrays to sorted scalar ids/urls so order-insensitive,
        // shape-insensitive values can be compared with deepEqualObj. Empty strings
        // collapse to null so clearing a text field reads as equal to an unset one.
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
          return value === "" ? null : (value ?? null)
        }

        const isEqual = (a: JsonValue | undefined, b: JsonValue | undefined): boolean =>
          deepEqualObj(normalize(a), normalize(b))

        const acts: Array<
          Omit<CreateProductChangeActionDTO, "product_change_id">
        > = []

        if (proposed.status !== undefined) {
          if (
            !isEqual(current.status, proposed.status)
          ) {
            acts.push({
              product_id: input.product_id,
              action: ProductChangeActionType.STATUS_CHANGE,
              details: toJsonRecord({
                status: proposed.status,
                previous_status: current.status,
              }),
            })
          }
        }

        for (const field of DIFFABLE_FIELDS) {
          if (!(field in proposed)) continue
          const proposedValue = proposed[field]
          const currentValue = current[field]
          if (isEqual(currentValue, proposedValue)) continue

          acts.push({
            product_id: input.product_id,
            action: ProductChangeActionType.UPDATE,
            details: toJsonRecord({
              field,
              value: proposedValue,
              previous_value: currentValue,
            }),
          })
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

    const productChangeCreated = createHook("productChangeCreated", {
      product_change: change,
      additional_data: input.additional_data,
    })

    return new WorkflowResponse(change, {
      hooks: [validate, productChangeCreated],
    })
  },
)
