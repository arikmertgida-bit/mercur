import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { parseProductCsvStep } from "@medusajs/core-flows"
import { createProductsWorkflow } from "@medusajs/core-flows"
import { ProductDTO } from "@mercurjs/types"
import { validateProductsToImportStep } from "./steps/validate-products-to-import"
type ParsedProductInput = Partial<ProductDTO> & { status?: string }

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
        products: (parsedProducts as ParsedProductInput[]).map((product) => ({
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
