import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  generateProductCsvStep,
  useQueryGraphStep,
} from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import { getSellerProductsStep } from "../steps/get-seller-products"

type ExportSellerProductsWorkflowInput = {
  seller_id: string
}

export const exportSellerProductsWorkflow = createWorkflow(
  "export-seller-products",
  function (input: ExportSellerProductsWorkflowInput) {
    const products = getSellerProductsStep({
      seller_id: input.seller_id,
    })

    // query.graph resolves the internal remote-query Product model, whose
    // timestamp fields are typed as Date while the CSV export DTO expects
    // ISO strings. A JSON round-trip both satisfies the DTO shape and makes
    // it accurate: JSON.stringify serializes Date values to ISO strings.
    const csvProducts = transform(
      { products },
      ({ products }): HttpTypes.AdminProduct[] =>
        JSON.parse(JSON.stringify(products))
    )

    const csvFile = generateProductCsvStep(csvProducts)

    const fileData = useQueryGraphStep({
      entity: "file",
      fields: ["id", "url"],
      filters: {
        id: csvFile.id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    const result = transform({ fileData }, ({ fileData }) => {
      const file = fileData.data[0]
      return { url: file.url }
    })

    return new WorkflowResponse(result)
  }
)
