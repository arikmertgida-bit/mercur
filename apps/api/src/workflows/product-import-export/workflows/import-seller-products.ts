import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { parseProductCsvStep } from "@medusajs/core-flows"
import { createProductsWorkflow } from "@mercurjs/core/workflows"
import { validateProductsToImportStep } from "../steps/validate-products-to-import"

type ImportSellerProductsWorkflowInput = {
  file_content: string
  seller_id: string
}

export const importSellerProductsWorkflow = createWorkflow(
  "import-seller-products",
  function (input: ImportSellerProductsWorkflowInput) {
    const parsedProducts = parseProductCsvStep(input.file_content)

    validateProductsToImportStep({ products: parsedProducts })

    const productsInput = transform(
      { parsedProducts, input },
      ({ parsedProducts, input }) => ({
        products: parsedProducts.map((product) => ({
          ...product,
          status: product.status || "draft",
          seller_ids: [input.seller_id],
        })),
        created_by: input.seller_id,
      })
    )

    const createdProducts = createProductsWorkflow.runAsStep({
      input: productsInput,
    })

    return new WorkflowResponse(createdProducts)
  }
)
