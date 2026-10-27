import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"

import { parseGraphRows } from "../../utils/graph-rows"

const CategoryRefSchema = z.object({ id: z.string().nullish() })
type CategoryRef = z.infer<typeof CategoryRefSchema>

const AttributeWithCategoriesSchema = z.object({
  id: z.string(),
  // The remote joiner may return a single object instead of an array when an
  // attribute has exactly one category link, so accept both shapes.
  categories: z
    .union([CategoryRefSchema, z.array(CategoryRefSchema.nullable())])
    .nullish(),
})

export const filterAttributesByCategoryLinkOrGlobal = async (
  req: MedusaRequest,
  _: MedusaResponse,
  next: MedusaNextFunction
) => {
  const filterableFields = req.filterableFields ?? {}
  const categoryFilter = filterableFields.product_category_id

  if (!categoryFilter) {
    return next()
  }

  delete filterableFields.product_category_id

  const categoryIds = Array.isArray(categoryFilter)
    ? categoryFilter
    : [categoryFilter]

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: attributes } = await query.graph({
    entity: "product_attribute",
    fields: ["id", "categories.id"],
  })

  const categoryIdSet = new Set(categoryIds)
  const linkedToCategoryIds: string[] = []
  const anyLinkedIds: string[] = []

  for (const attribute of parseGraphRows(
    AttributeWithCategoriesSchema,
    attributes
  )) {
    const raw = attribute.categories
    const categoryLinks: Array<CategoryRef | null> = Array.isArray(raw)
      ? raw
      : raw
        ? [raw]
        : []
    if (categoryLinks.length === 0) {
      continue
    }
    anyLinkedIds.push(attribute.id)
    if (
      categoryLinks.some((c) => c?.id != null && categoryIdSet.has(c.id))
    ) {
      linkedToCategoryIds.push(attribute.id)
    }
  }

  const orClause = [
    { id: linkedToCategoryIds },
    { id: { $nin: anyLinkedIds } },
  ]

  const existingId = filterableFields.id
  if (existingId !== undefined) {
    filterableFields.$and = [{ id: existingId }, { $or: orClause }]
    delete filterableFields.id
  } else {
    filterableFields.$or = orClause
  }

  req.filterableFields = filterableFields

  return next()
}
