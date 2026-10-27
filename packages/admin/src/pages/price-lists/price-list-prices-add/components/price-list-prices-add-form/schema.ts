import { z } from "zod"
import { PriceListCreateProductsSchema } from "../../../common/schemas"

export const PriceListPricesAddSchema = z.object({
  product_ids: z.array(z.object({ id: z.string() })).min(1),
  products: PriceListCreateProductsSchema,
})

export type PriceListPricesAddSchema = z.infer<typeof PriceListPricesAddSchema>

export const PriceListPricesAddProductIdsSchema = PriceListPricesAddSchema.pick(
  {
    product_ids: true,
  }
)

export const PriceListPricesAddProductsIdsFields = PriceListPricesAddProductIdsSchema.keyof().options

export const PriceListPricesAddProductsSchema = PriceListPricesAddSchema.pick({
  products: true,
})

export const PriceListPricesAddProductsFields = PriceListPricesAddProductsSchema.keyof().options
