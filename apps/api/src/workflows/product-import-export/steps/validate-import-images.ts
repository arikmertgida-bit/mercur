import { AdminCreateProduct } from "@medusajs/framework/types"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { assertSellerImageUrls } from "@mercurjs/core/api/utils/seller-upload"

type ValidateImportImagesStepInput = {
  products: AdminCreateProduct[]
  seller_id: string
}

/**
 * CSV image columns would otherwise put any address on the storefront
 * (every visitor's browser fetching it); only the seller's own uploads or
 * images its products already use are accepted.
 */
export const validateImportImagesStep = createStep(
  "validate-import-images",
  async (input: ValidateImportImagesStepInput, { container }) => {
    await assertSellerImageUrls(
      container,
      input.seller_id,
      input.products.flatMap((product) => [
        product.thumbnail,
        ...(product.images ?? []).map((image) => image.url),
      ])
    )

    return new StepResponse(undefined)
  }
)
