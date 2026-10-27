import { z } from "zod"
import { AddressRowSchema } from "../../../utils/address-row"
import { GraphBigNumberSchema } from "../../../utils/graph-rows"
import { JsonRecordSchema } from "../../../utils/json-schema"

// Row shapes of the `completeCartFields` selection. Every field the order
// split reads is declared here, so a parsed cart carries all of them.

export const TaxLineRowSchema = z.object({
    description: z.string().nullish(),
    tax_rate_id: z.string().nullish(),
    code: z.string(),
    rate: z.number(),
    provider_id: z.string().nullish(),
})

export type TaxLineRow = z.infer<typeof TaxLineRowSchema>

export const AdjustmentRowSchema = z.object({
    code: z.string().nullish(),
    amount: GraphBigNumberSchema,
    description: z.string().nullish(),
    promotion_id: z.string().nullish(),
    provider_id: z.string().nullish(),
    is_tax_inclusive: z.boolean().nullish(),
})

export type AdjustmentRow = z.infer<typeof AdjustmentRowSchema>

const IdRowSchema = z.object({ id: z.string() })

export const CartLineItemVariantRowSchema = z.object({
    id: z.string(),
    title: z.string().nullish(),
    sku: z.string().nullish(),
    barcode: z.string().nullish(),
    thumbnail: z.string().nullish(),
    product: z
        .object({
            id: z.string(),
            title: z.string().nullish(),
            subtitle: z.string().nullish(),
            description: z.string().nullish(),
            handle: z.string().nullish(),
            thumbnail: z.string().nullish(),
            is_giftcard: z.boolean().nullish(),
            discountable: z.boolean().nullish(),
            type: z.object({ id: z.string(), value: z.string() }).nullish(),
            collection: z.object({ id: z.string(), title: z.string() }).nullish(),
            shipping_profile: IdRowSchema.nullish(),
            sellers: z.array(IdRowSchema).nullish(),
        })
        .nullish(),
    inventory_items: z
        .array(
            z.object({
                inventory: z
                    .object({ requires_shipping: z.boolean().nullish() })
                    .nullish(),
            })
        )
        .nullish(),
})

export type CartLineItemVariantRow = z.infer<typeof CartLineItemVariantRowSchema>

export const CartLineItemRowSchema = z.object({
    id: z.string(),
    title: z.string(),
    subtitle: z.string().nullish(),
    thumbnail: z.string().nullish(),
    quantity: GraphBigNumberSchema,
    product_id: z.string().nullish(),
    product_title: z.string().nullish(),
    product_description: z.string().nullish(),
    product_subtitle: z.string().nullish(),
    product_type: z.string().nullish(),
    product_type_id: z.string().nullish(),
    product_collection: z.string().nullish(),
    product_handle: z.string().nullish(),
    variant_sku: z.string().nullish(),
    variant_barcode: z.string().nullish(),
    variant_title: z.string().nullish(),
    variant_option_values: JsonRecordSchema.nullish(),
    requires_shipping: z.boolean(),
    is_discountable: z.boolean(),
    is_tax_inclusive: z.boolean(),
    compare_at_unit_price: GraphBigNumberSchema.nullish(),
    unit_price: GraphBigNumberSchema,
    metadata: JsonRecordSchema.nullish(),
    tax_lines: z.array(TaxLineRowSchema).nullish(),
    adjustments: z.array(AdjustmentRowSchema).nullish(),
    variant: CartLineItemVariantRowSchema.nullish(),
})

export type CartLineItemRow = z.infer<typeof CartLineItemRowSchema>

export const CartShippingMethodRowSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullish(),
    amount: GraphBigNumberSchema,
    raw_amount: GraphBigNumberSchema.nullish(),
    is_tax_inclusive: z.boolean(),
    shipping_option_id: z.string().nullish(),
    data: JsonRecordSchema.nullish(),
    metadata: JsonRecordSchema.nullish(),
    tax_lines: z.array(TaxLineRowSchema).nullish(),
    adjustments: z.array(AdjustmentRowSchema).nullish(),
})

export const CompleteCartRowSchema = z.object({
    id: z.string(),
    email: z.string().nullish(),
    currency_code: z.string(),
    locale: z.string().nullish(),
    metadata: JsonRecordSchema.nullish(),
    sales_channel_id: z.string().nullish(),
    customer_id: z.string().nullish(),
    customer: IdRowSchema.nullish(),
    region: IdRowSchema.nullish(),
    shipping_address: AddressRowSchema.nullish(),
    billing_address: AddressRowSchema.nullish(),
    items: z.array(CartLineItemRowSchema).nullish(),
    shipping_methods: z.array(CartShippingMethodRowSchema).nullish(),
    promotions: z
        .array(z.object({ id: z.string(), code: z.string().nullish() }))
        .nullish(),
})

export type CompleteCartRow = z.infer<typeof CompleteCartRowSchema>

/** A `shipping_option` row with its owning seller selected. */
export const SellerShippingOptionRowSchema = z.object({
    id: z.string(),
    shipping_profile_id: z.string(),
    seller: IdRowSchema,
})

export type SellerShippingOptionRow = z.infer<typeof SellerShippingOptionRowSchema>
