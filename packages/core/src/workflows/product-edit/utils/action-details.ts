import {
  AttributeType,
  ProductAttributeBatchAdd,
  ProductAttributeBatchUpdate,
  ProductStatus,
} from "@mercurjs/types"
import { z } from "zod"

import {
  VendorAddProductVariant,
  VendorProductUpdateFields,
  VendorUpdateProductVariant,
} from "../../../api/vendor/products/validators"
import { JsonRecordSchema, JsonValueSchema } from "../../../utils/json-schema"

/**
 * A product change action's `details` are stored as JSON. Each action type is
 * read back through the schema of what was staged for it; the product and
 * variant payloads were validated against the vendor schemas when staged.
 */
export const ChangeActionRowSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  action: z.string(),
  details: JsonRecordSchema.nullish(),
  applied: z.boolean(),
})

export const StatusChangeDetailsSchema = z.object({
  status: z.string().optional(),
})

export const FieldUpdateDetailsSchema = z.object({
  field: z.string().optional(),
  value: JsonValueSchema.optional(),
})

export const VariantAddDetailsSchema = z.object({
  variant: JsonRecordSchema.optional(),
})

export const VariantUpdateDetailsSchema = z.object({
  variant_id: z.string().optional(),
  fields: JsonRecordSchema.optional(),
})

export const VariantImagesSchema = z.object({
  add: z.array(z.string()).optional(),
  remove: z.array(z.string()).optional(),
})

export const VariantRemoveDetailsSchema = z.object({
  variant_id: z.string().optional(),
})

const AttributeScalarSchema = z.union([z.string(), z.number(), z.boolean()])

const ProductAttributeBatchAddSchema: z.ZodType<ProductAttributeBatchAdd> =
  z.union([
    z.object({
      id: z.string(),
      value_ids: z.array(z.string()).optional(),
      value: AttributeScalarSchema.optional(),
    }),
    z.object({
      title: z.string(),
      type: z.enum(AttributeType).optional(),
      values: z.array(z.string()).optional(),
      value: AttributeScalarSchema.optional(),
      is_variant_axis: z.boolean().optional(),
      is_filterable: z.boolean().optional(),
      is_required: z.boolean().optional(),
      description: z.string().nullish(),
      metadata: JsonRecordSchema.nullish(),
    }),
  ])

const ProductAttributeBatchUpdateSchema: z.ZodType<ProductAttributeBatchUpdate> =
  z.object({
    id: z.string(),
    title: z.string().optional(),
    add: z
      .array(z.union([z.string(), z.object({ value: z.string() })]))
      .optional(),
    remove: z.array(z.string()).optional(),
    value_ids: z.array(z.string()).optional(),
    value: AttributeScalarSchema.optional(),
  })

export const AttributeAddDetailsSchema = z.object({
  attribute: ProductAttributeBatchAddSchema.optional(),
})

export const AttributeRemoveDetailsSchema = z.object({
  attribute_id: z.string().optional(),
})

export const AttributeUpdateDetailsSchema = z.object({
  update: ProductAttributeBatchUpdateSchema.optional(),
})

export const StagedProductUpdateSchema = VendorProductUpdateFields.extend({
  id: z.string(),
  status: z.enum(ProductStatus).optional(),
})

export const StagedVariantCreateSchema = VendorAddProductVariant.extend({
  product_id: z.string(),
})

export const StagedVariantUpdateSchema = VendorUpdateProductVariant.omit({
  images: true,
}).extend({ id: z.string() })
