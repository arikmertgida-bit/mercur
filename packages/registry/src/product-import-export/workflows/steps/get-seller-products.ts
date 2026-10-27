import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { Query } from "@medusajs/framework/modules-sdk"
import { HttpTypes } from "@medusajs/framework/types"

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

    // The selected fields mirror Medusa's own product export, so each linked
    // product is handed to `generateProductCsvStep` unchanged.
    const products: HttpTypes.AdminProduct[] = relations.map(
      (relation) => relation.product
    )

    return new StepResponse(products)
  }
)
