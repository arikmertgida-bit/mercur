import { z } from "zod"
import { isValidHandleFormat } from "@mercurjs/dashboard-shared"
import { i18n } from "../../../components/utilities/i18n/i18n"
import { optionalInt } from "../../../lib/validation"
import { decorateVariantsWithDefaultValues, hasVariantMediaColumn } from "./utils"

export const MediaSchema = z.object({
  id: z.string().optional(),
  url: z.string(),
  isThumbnail: z.boolean(),
  file: z.instanceof(File).nullable(),
})

// Sellers upload product photography from phone cameras; capping the
// gallery keeps the create-product payload and storefront gallery
// predictable across every product.
export const MAX_PRODUCT_MEDIA_COUNT = 12

const ProductCreateVariantSchema = z.object({
  should_create: z.boolean(),
  is_default: z.boolean().optional(),
  title: z.string(),
  upc: z.string().optional(),
  ean: z.string().optional(),
  barcode: z.string().optional(),
  mid_code: z.string().optional(),
  hs_code: z.string().optional(),
  width: optionalInt,
  height: optionalInt,
  length: optionalInt,
  weight: optionalInt,
  material: z.string().optional(),
  origin_country: z.string().optional(),
  sku: z.string().optional(),
  options: z.record(z.string(), z.string()).optional(),
  variant_rank: z.number(),
  // `z.literal("")` MUST come before `z.coerce.number()` in this union:
  // Zod tries union members in order, and `z.coerce.number()` happily
  // coerces an empty string to `0` (`Number("") === 0`) — tried first, it
  // would silently turn "left blank" into a valid zero, making an empty
  // cell indistinguishable from an intentionally entered 0 everywhere this
  // field is read (including the required-price/-stock checks below).
  prices: z
    .record(z.string(), z.union([z.literal(""), z.coerce.number().min(0)]))
    .default({}),
  inventory: z
    .record(
      z.string(),
      z.object({
        checked: z.boolean().default(false),
        quantity: z.union([z.literal(""), z.coerce.number().min(0)]).default(""),
        disabledToggle: z.boolean().optional(),
      })
    )
    .default({}),
  // Subset of the product's own `media` field-array, selected per variant
  // (matched by `MediaSchema.id`, the same stable client id `FileUpload`
  // assigns on upload). Only populated when the product has variant axes.
  media: z.array(MediaSchema).default([]),
})

export type ProductCreateVariantSchema = z.infer<
  typeof ProductCreateVariantSchema
>

export const ProductCreateSchema = z
  .object({
    title: z.string().min(1, {
      message: i18n.t("products.fields.title.required"),
    }),
    subtitle: z.string().optional(),
    handle: z
      .string()
      .refine(isValidHandleFormat, { message: i18n.t("fields.handleInvalidFormat") }),
    description: z.string().optional(),
    discountable: z.boolean(),
    type_id: z.string().optional(),
    collection_id: z.string().optional(),
    shipping_profile_id: z.string().min(1, {
      message: i18n.t("products.create.errors.shippingProfileRequired"),
    }),
    category_id: z.string().min(1, {
      message: i18n.t("products.create.errors.categoryRequired"),
    }),
    tags: z.array(z.string()).optional(),
    origin_country: z.string().optional(),
    material: z.string().optional(),
    width: z.string().optional(),
    length: z.string().optional(),
    height: z.string().optional(),
    weight: z.string().optional(),
    mid_code: z.string().optional(),
    hs_code: z.string().optional(),
    attributes: z.array(z.object({
      attribute_id: z.string().optional(),
      title: z.string().min(1),
      values: z.union([z.string(), z.array(z.string())]).optional(),
      is_custom: z.boolean(),
      is_required: z.boolean().optional(),
      use_for_variants: z.boolean(),
      type: z.string().optional(),
      available_values: z.array(z.object({
        id: z.string(),
        name: z.string(),
      })).optional(),
    })).optional()
      .superRefine((attributes, ctx) => {
        attributes?.forEach((attr, index) => {
          if (!attr.is_required) return

          const isEmpty = attr.values === undefined ||
            attr.values === "" ||
            (Array.isArray(attr.values) && attr.values.length === 0)

          if (!isEmpty) return

          let messageKey = "products.create.errors.requiredAttribute"
          if (attr.type === "single_select" || attr.type === "toggle") {
            messageKey = "products.create.errors.requiredAttributeSelect"
          } else if (attr.type === "multi_select") {
            messageKey = "products.create.errors.requiredAttributeMultiSelect"
          } else if (attr.type === "text" || attr.type === "unit") {
            messageKey = "products.create.errors.requiredAttributeEnter"
          }

          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, "values"],
            message: i18n.t(messageKey),
          })
        })
      }),
    variants: z.array(ProductCreateVariantSchema).min(1),
    media: z.array(MediaSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.variants.every((v) => !v.should_create)) {
      return ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variants"],
        message: "invalid_length",
      })
    }

    const skus = new Set<string>()
    const requireMedia = hasVariantMediaColumn(data.attributes)

    data.variants.forEach((v, index) => {
      if (v.sku) {
        if (skus.has(v.sku)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [`variants.${index}.sku`],
            message: i18n.t("products.create.errors.uniqueSku"),
          })
        }

        skus.add(v.sku)
      }

      if (!v.should_create) {
        return
      }

      const hasPrice = Object.values(v.prices).some(
        (amount) => typeof amount === "number"
      )
      if (!hasPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [`variants.${index}.prices`],
          message: i18n.t("products.create.errors.priceRequired"),
        })
      }

      // `> 0`, not just `typeof === "number"`: the stock grid's toggle
      // cell (`DataGridTogglableNumberCell`) auto-fills `quantity: 0` the
      // instant the location switch is flipped on, before the seller ever
      // types a number — so "toggled but left blank" and "toggled and
      // typed 0" are indistinguishable as data. Requiring a positive
      // quantity is the only way to actually catch the blank case.
      const hasStock = Object.values(v.inventory).some(
        (level) =>
          level.checked &&
          typeof level.quantity === "number" &&
          level.quantity > 0
      )
      if (!hasStock) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [`variants.${index}.inventory`],
          message: i18n.t("products.create.errors.stockRequired"),
        })
      }

      if (requireMedia && v.media.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [`variants.${index}.media`],
          message: i18n.t("products.create.errors.mediaRequired"),
        })
      }
    })
  })

export const EditProductMediaSchema = z.object({
  media: z.array(MediaSchema),
})

// Shared with the auto-fill logic in `product-create-variants-form.tsx`: a
// variant still carrying this placeholder hasn't had a title typed by the
// seller yet, so it's safe to overwrite with the product title.
export const DEFAULT_VARIANT_TITLE = i18n.t(
  "products.create.defaults.variantTitle"
)

export const PRODUCT_CREATE_FORM_DEFAULTS: Partial<
  z.infer<typeof ProductCreateSchema>
> = {
  discountable: true,
  tags: [],
  variants: decorateVariantsWithDefaultValues([
    {
      title: DEFAULT_VARIANT_TITLE,
      should_create: true,
      variant_rank: 0,
      options: {},
      is_default: true,
      prices: {},
      inventory: {},
      media: [],
    },
  ]),
  attributes: [],
  media: [],
  category_id: "",
  collection_id: "",
  shipping_profile_id: "",
  description: "",
  handle: "",
  height: "",
  hs_code: "",
  length: "",
  material: "",
  mid_code: "",
  origin_country: "",
  subtitle: "",
  title: "",
  type_id: "",
  weight: "",
  width: "",
}
