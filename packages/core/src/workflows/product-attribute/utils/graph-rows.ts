import { AttributeType } from "@mercurjs/types"
import { z } from "zod"

import { parseGraphRows } from "../../../utils/graph-rows"

const AttributeValueRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  product_option_value_id: z.string().nullable(),
})

/**
 * A `product_attribute` row as the attribute workflows select it; the columns
 * a given workflow does not select are optional.
 */
export const AttributeRowSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: z.enum(AttributeType),
  is_required: z.boolean().optional(),
  is_variant_axis: z.boolean(),
  product_id: z.string().nullish(),
  product_option_id: z.string().nullish(),
  values: z.array(AttributeValueRowSchema).nullish(),
})

export type AttributeRow = z.infer<typeof AttributeRowSchema>

export const attributesById = <TRow>(
  rows: readonly TRow[] | null | undefined
): Map<string, AttributeRow> =>
  new Map(parseGraphRows(AttributeRowSchema, rows).map((a) => [a.id, a]))

/** A product's `product_attribute_values` link rows. */
export const ProductAttributeValueLinkRowSchema = z.object({
  id: z.string(),
  attribute: z.object({ id: z.string() }).nullish(),
})

/** The ids of the attribute values a product holds, per attribute. */
export const linkedValueIdsByAttribute = <TRow>(
  product:
    | { product_attribute_values?: readonly TRow[] | null }
    | null
    | undefined
): Map<string, string[]> => {
  const linkedByAttr = new Map<string, string[]>()
  for (const v of parseGraphRows(
    ProductAttributeValueLinkRowSchema,
    product?.product_attribute_values
  )) {
    if (!v.attribute) {
      continue
    }
    const list = linkedByAttr.get(v.attribute.id) ?? []
    list.push(v.id)
    linkedByAttr.set(v.attribute.id, list)
  }
  return linkedByAttr
}
