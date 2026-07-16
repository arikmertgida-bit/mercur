import type { Query } from "@medusajs/framework"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type GetSellerProductsStepInput = {
  seller_id: string
}

export const getSellerProductsStep = createStep(
  "get-seller-products",
  async (input: GetSellerProductsStepInput, { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const { data: relations } = await query.graph({
      entity: "product_seller",
      fields: [
        "product.*",
        "product.variants.*",
        "product.variants.prices.*",
        "product.variants.options.*",
        "product.options.*",
        "product.collection.*",
        "product.categories.*",
        "product.sales_channels.*",
        "product.images.*",
        "product.tags.*",
        "product.type.*",
      ],
      filters: {
        seller_id: input.seller_id,
      },
    })

    const products = relations
      .map((relation) => relation.product)
      .filter(
        (product): product is NonNullable<typeof product> =>
          product !== null && product !== undefined
      )

    return new StepResponse(products)
  }
)
