import type { DateComparisonFilter } from "@mercurjs/dashboard-shared"
import { HttpTypes } from "@medusajs/types"
import { useMemo } from "react"

import { useSellerProducts } from "../../../hooks/api/sellers"
import { getOrderSellerId } from "../../../lib/orders"

const PRODUCT_PICKER_FIELDS = [
  "id",
  "title",
  "thumbnail",
  "variants.id",
  "variants.sku",
  "variants.title",
].join(",")

export type OrderStoreVariantRow = {
  id: string
  sku?: string | null
  title?: string | null
  product?: {
    id?: string | null
    title?: string | null
    thumbnail?: string | null
  } | null
}

type ProductPickerRow = {
  id?: string | null
  title?: string | null
  thumbnail?: string | null
  variants?: { id: string; sku?: string | null; title?: string | null }[] | null
}

type OrderStoreVariantsQuery = {
  q?: string
  order?: string
  limit: number
  offset: number
  created_at?: DateComparisonFilter
  updated_at?: DateComparisonFilter
}

/**
 * The variants an admin may add to an order (edit, claim or exchange
 * outbound): only the order's own store sells into it, the API rejects any
 * other store's variant. Pages are counted in products, the unit the API
 * paginates by.
 */
export const useOrderStoreVariants = (
  order: HttpTypes.AdminOrder,
  query: OrderStoreVariantsQuery,
  enabled: boolean
): { variants: OrderStoreVariantRow[]; count: number; isLoading: boolean } => {
  const sellerId = getOrderSellerId(order)

  const { products, count, isLoading } = useSellerProducts(
    sellerId ?? "",
    { ...query, order: query.order, fields: PRODUCT_PICKER_FIELDS },
    { enabled: enabled && !!sellerId }
  )
  const rows: ProductPickerRow[] | undefined = products

  const variants = useMemo<OrderStoreVariantRow[]>(
    () =>
      (rows ?? []).flatMap((product) =>
        (product.variants ?? []).map((variant) => ({
          ...variant,
          product: {
            id: product.id,
            title: product.title,
            thumbnail: product.thumbnail,
          },
        }))
      ),
    [rows]
  )

  return { variants, count: sellerId ? (count ?? 0) : 0, isLoading }
}
