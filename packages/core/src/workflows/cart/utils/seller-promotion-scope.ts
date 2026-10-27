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
