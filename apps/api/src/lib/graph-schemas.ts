import { z } from "zod"

export const JsonPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.date(),
])

type JsonValue =
  | string
  | number
  | boolean
  | null
  | Date
  | JsonValue[]
  | { [key: string]: JsonValue }

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    JsonPrimitiveSchema,
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ])
)

export const JsonRecordSchema = z.record(z.string(), JsonValueSchema)

export type JsonRecord = z.infer<typeof JsonRecordSchema>

export const SellerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const PersonNameRowSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
})

export const AdminUserRowSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
})

export const ProductSellerIdsRowSchema = z.object({
  id: z.string(),
  sellers: z.array(z.object({ id: z.string() })).nullable().optional(),
})

export const CustomerSummarySchema = z.object({
  id: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string().nullable(),
})

export const ProductDetailRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string().nullable(),
  thumbnail: z.string().nullable(),
  status: z.string(),
  seller: z
    .object({
      id: z.string(),
      name: z.string(),
      handle: z.string(),
    })
    .optional(),
})

export const ProductReportRowSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  customer_id: z.string(),
  reason: z.string(),
  comment: z.string().nullable().optional(),
  status: z.string(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
})

export const ProductReviewRowSchema = z.object({
  id: z.string(),
  reference: z.string(),
  rating: z.number(),
  customer_note: z.string().nullable().optional(),
  seller_note: z.string().nullable().optional(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
  customer: z
    .object({
      first_name: z.string().nullable().optional(),
      last_name: z.string().nullable().optional(),
      metadata: JsonRecordSchema.nullable().optional(),
    })
    .nullable()
    .optional(),
})

export function extractAvatarUrl(
  metadata: JsonRecord | null | undefined
): string | undefined {
  const value = metadata?.avatar_url
  return typeof value === "string" ? value : undefined
}

export const WishlistRowSchema = z.object({
  id: z.string(),
  reference: z.string(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
  customer: CustomerSummarySchema.nullable().optional(),
  products: z
    .array(z.object({ id: z.string(), title: z.string() }))
    .nullable()
    .optional(),
})

export const CustomerReviewSellerRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  logo: z.string().nullable().optional(),
  members: z
    .array(
      z.object({
        id: z.string(),
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
      })
    )
    .optional(),
})

export const CustomerReviewRowSchema = z.object({
  id: z.string(),
  reference: z.enum(["product", "seller"]),
  reference_id: z.string().nullable().optional(),
  rating: z.number(),
  customer_note: z.string().nullable().optional(),
  seller_note: z.string().nullable().optional(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
  customer: z
    .object({
      first_name: z.string().nullable().optional(),
      last_name: z.string().nullable().optional(),
      metadata: JsonRecordSchema.nullable().optional(),
    })
    .nullable()
    .optional(),
  seller: CustomerReviewSellerRowSchema.nullable().optional(),
})

export const ReviewImageRowSchema = z.object({
  id: z.string(),
  review_id: z.string(),
  url: z.string(),
  is_hidden: z.boolean(),
})

export const ReviewImageReportRowSchema = z.object({
  id: z.string(),
  review_image_id: z.string(),
  customer_id: z.string(),
  reason: z.string(),
  status: z.string(),
  action_taken: z.string().nullable().optional(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
})

export const ReviewSummaryRowSchema = z.object({
  id: z.string(),
  reference: z.string(),
  rating: z.number(),
  customer_note: z.string().nullable().optional(),
  seller_note: z.string().nullable().optional(),
  customer_id: z.string().nullable().optional(),
})

export const ReviewReportRowSchema = z.object({
  id: z.string(),
  review_id: z.string(),
  seller_id: z.string(),
  reason: z.string(),
  status: z.enum(["pending", "resolved_deleted", "resolved_kept"]),
  admin_note: z.string().nullable().optional(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
})

export const SellerFollowerLinkRowSchema = z.object({
  seller_follower: z
    .object({
      id: z.string(),
      created_at: z.union([z.string(), z.date()]),
      customer: z
        .object({
          id: z.string(),
          email: z.string().nullable(),
          first_name: z.string().nullable(),
          last_name: z.string().nullable(),
          metadata: JsonRecordSchema.nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
})

export const OrderCustomerRowSchema = z.object({
  id: z.string(),
  customer_id: z.string().nullable(),
})

export const OrderSellerLinkRowSchema = z.object({
  order_id: z.string(),
})

export const CustomerReviewLinkRowSchema = z.object({
  customer_id: z.string(),
  review: z
    .object({
      id: z.string(),
      rating: z.number(),
      reference: z.enum(["product", "seller"]),
      product: z.object({ id: z.string() }).nullable().optional(),
      seller: z.object({ id: z.string() }).nullable().optional(),
    })
    .nullable()
    .optional(),
})

export const ProductSellerLinkRowSchema = z.object({
  product_id: z.string(),
})

export function buildCustomerDisplayName(
  customer: z.infer<typeof CustomerSummarySchema>
): string {
  const fullName = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")
  return fullName || customer.email || customer.id
}

export function parseRows<T>(
  schema: z.ZodType<T>,
  rows: object[] | null | undefined
): T[] {
  if (!rows) {
    return []
  }
  return rows.flatMap((row) => {
    const parsed = schema.safeParse(row)
    return parsed.success ? [parsed.data] : []
  })
}

export function parseFirstRow<T>(
  schema: z.ZodType<T>,
  rows: object[] | null | undefined
): T | null {
  if (!rows || rows.length === 0) {
    return null
  }
  const parsed = schema.safeParse(rows[0])
  return parsed.success ? parsed.data : null
}
