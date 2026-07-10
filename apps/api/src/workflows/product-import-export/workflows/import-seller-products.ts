import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { parseProductCsvStep, createProductsWorkflow } from "@medusajs/core-flows"
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
      { parsedProducts },
      ({ parsedProducts }) => ({
        products: parsedProducts.map((product) => ({
          ...product,
          status: product.status || "draft",
        })),
      })
    )

    const createdProducts = createProductsWorkflow.runAsStep({
      input: productsInput,
    })

    return new WorkflowResponse(createdProducts)
  }
)
