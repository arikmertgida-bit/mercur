import { Query } from "@medusajs/framework"
import { z } from "zod"
import { parseGraphRows } from "../../../utils/graph-rows"

const PromotionSellerRowSchema = z.object({
    id: z.string(),
    seller: z.object({ id: z.string() }).nullish(),
})

/**
 * Seller id per promotion id. A promotion without a seller link is a
 * platform promotion and maps to `null`.
 */
export type PromotionSellerIds = Record<string, string | null>

const unique = (values: Array<string | undefined | null>): string[] =>
    Array.from(
        new Set(values.filter((v): v is string => typeof v === "string" && v.length > 0))
    )

export const loadPromotionSellerIds = async (
    query: Query,
    promotionIds: Array<string | undefined | null>
): Promise<PromotionSellerIds> => {
    const ids = unique(promotionIds)
    if (!ids.length) {
        return {}
    }

    const { data: promotions } = await query.graph(
        {
            entity: "promotion",
            fields: ["id", "seller.id"],
            filters: { id: ids },
        },
        { cache: { enable: true } }
    )

    const result: PromotionSellerIds = {}
    for (const promotion of parseGraphRows(PromotionSellerRowSchema, promotions)) {
        result[promotion.id] = promotion.seller?.id ?? null
    }
    return result
}

/**
 * A seller's promotion may only discount that seller's lines and shipping;
 * a platform promotion (no seller link) may discount anything.
 */
export const isAdjustmentInSellerScope = (
    promotionSellerId: string | null | undefined,
    targetSellerId: string | null | undefined
): boolean => !promotionSellerId || promotionSellerId === targetSellerId

const ScopeCartSchema = z.object({
    items: z
        .array(z.object({ id: z.string(), product_id: z.string().nullish() }).nullish())
        .nullish(),
    shipping_methods: z
        .array(
            z.object({ id: z.string(), shipping_option_id: z.string().nullish() }).nullish()
        )
        .nullish(),
    promotions: z.array(z.object({ code: z.string().nullish() }).nullish()).nullish(),
})

const ProductSellersRowSchema = z.object({
    id: z.string(),
    sellers: z.array(z.object({ id: z.string() }).nullish()).nullish(),
})

const ShippingOptionSellerRowSchema = z.object({
    id: z.string(),
    seller: z.object({ id: z.string() }).nullish(),
})

const ScopedPromotionRowSchema = z.object({
    id: z.string(),
    seller: z.object({ id: z.string() }).nullish(),
})

export const SELLER_PROMOTION_SCOPE_CONTEXT_KEY = "seller_promotion_scope"

export type SellerScopedLine = { id: string; seller_id: string }

/**
 * Read by the promotion module patch: a seller promotion is computed against
 * the lines and shipping methods of its seller only. `checked` lists every
 * promotion that was looked up, so one missing from it (created after the
 * lookup) is skipped for this pass instead of being taken for a platform one.
 */
export type SellerPromotionScope = {
    checked: string[]
    promotions: Array<{ promotion_id: string; seller_id: string }>
    items: SellerScopedLine[]
    shipping_methods: SellerScopedLine[]
}

export type SellerPromotionScopeContext = {
    [SELLER_PROMOTION_SCOPE_CONTEXT_KEY]: SellerPromotionScope
}

const PROMOTION_STATUS_ACTIVE = "active"

/**
 * Builds the promotion context entry that keeps seller promotions on their
 * seller's lines. The candidates are the codes being applied or already on the
 * cart plus every active automatic promotion — the same set computeActions
 * considers — so the module never meets a promotion whose owner is unknown.
 */
export const loadSellerPromotionScope = async (
    query: Query,
    cartInput: z.input<typeof ScopeCartSchema>,
    promoCodes: string[]
): Promise<SellerPromotionScopeContext> => {
    const cart = ScopeCartSchema.parse(cartInput)
    const items = (cart.items ?? []).filter((item) => !!item)
    const shippingMethods = (cart.shipping_methods ?? []).filter((method) => !!method)

    const productIds = unique(items.map((item) => item.product_id))
    const shippingOptionIds = unique(shippingMethods.map((method) => method.shipping_option_id))
    const codes = unique([
        ...promoCodes,
        ...(cart.promotions ?? []).map((promotion) => promotion?.code),
    ])

    const [productRows, shippingOptionRows, promotionRows] = await Promise.all([
        productIds.length
            ? query.graph({
                  entity: "product",
                  fields: ["id", "sellers.id"],
                  filters: { id: productIds },
              })
            : Promise.resolve({ data: [] }),
        shippingOptionIds.length
            ? query.graph({
                  entity: "shipping_option",
                  fields: ["id", "seller.id"],
                  filters: { id: shippingOptionIds },
              })
            : Promise.resolve({ data: [] }),
        query.graph({
            entity: "promotion",
            fields: ["id", "seller.id"],
            filters: {
                status: PROMOTION_STATUS_ACTIVE,
                ...(codes.length
                    ? { $or: [{ code: codes }, { is_automatic: true }] }
                    : { is_automatic: true }),
            },
        }),
    ])

    const sellerOfProduct = new Map(
        parseGraphRows(ProductSellersRowSchema, productRows.data).map((product) => [
            product.id,
            product.sellers?.[0]?.id ?? null,
        ])
    )
    const sellerOfShippingOption = new Map(
        parseGraphRows(ShippingOptionSellerRowSchema, shippingOptionRows.data).map(
            (option) => [option.id, option.seller?.id ?? null]
        )
    )
    const promotions = parseGraphRows(ScopedPromotionRowSchema, promotionRows.data)

    const scopedLines = (
        lines: Array<{ id: string; key: string | null | undefined }>,
        sellerOf: Map<string, string | null>
    ): SellerScopedLine[] =>
        lines.flatMap(({ id, key }) => {
            const sellerId = key ? sellerOf.get(key) : null
            return sellerId ? [{ id, seller_id: sellerId }] : []
        })

    return {
        [SELLER_PROMOTION_SCOPE_CONTEXT_KEY]: {
            checked: promotions.map((promotion) => promotion.id),
            promotions: promotions.flatMap((promotion) =>
                promotion.seller?.id
                    ? [{ promotion_id: promotion.id, seller_id: promotion.seller.id }]
                    : []
            ),
            items: scopedLines(
                items.map((item) => ({ id: item.id, key: item.product_id })),
                sellerOfProduct
            ),
            shipping_methods: scopedLines(
                shippingMethods.map((method) => ({ id: method.id, key: method.shipping_option_id })),
                sellerOfShippingOption
            ),
        },
    }
}
