import { IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export type VariantImageLinks = {
  variant_id: string
  add: string[]
  remove: string[]
}

type ApplyVariantImageLinksStepInput = {
  updates: VariantImageLinks[]
}

/**
 * The variant↔image methods (`addImageToVariant` / `removeImageFromVariant`)
 * exist on Medusa's concrete `ProductModuleService` at runtime but are
 * missing from the public `IProductModuleService` interface it implements —
 * a real third-party type gap, not our own typing shortcut. Declaration
 * merging is the correct fix (vs. `as unknown as`): it extends the actual
 * interface `container.resolve<IProductModuleService>()` returns, so no
 * cast is needed anywhere the module is resolved.
 */
declare module "@medusajs/types" {
  interface IProductModuleService {
    addImageToVariant(
      data: Array<{ variant_id: string; image_id: string }>,
    ): Promise<void>
    removeImageFromVariant(
      data: Array<{ variant_id: string; image_id: string }>,
    ): Promise<void>
  }
}

export const applyVariantImageLinksStepId = "pc-apply-variant-image-links"

/**
 * Variant images in Medusa are product images additionally linked to a
 * variant through the `product_variant_product_image` junction. Unlinking
 * drops the junction row only, leaving the image on the product.
 */
export const applyVariantImageLinksStep = createStep(
  applyVariantImageLinksStepId,
  async ({ updates }: ApplyVariantImageLinksStepInput, { container }) => {
    if (!updates.length) {
      return new StepResponse(void 0, updates)
    }

    const productService = container.resolve<IProductModuleService>(Modules.PRODUCT)

    const toAdd: Array<{ variant_id: string; image_id: string }> = []
    const toRemove: Array<{ variant_id: string; image_id: string }> = []

    for (const update of updates) {
      for (const image_id of update.add) {
        toAdd.push({ variant_id: update.variant_id, image_id })
      }
      for (const image_id of update.remove) {
        toRemove.push({ variant_id: update.variant_id, image_id })
      }
    }

    if (toAdd.length) {
      await productService.addImageToVariant(toAdd)
    }
    if (toRemove.length) {
      await productService.removeImageFromVariant(toRemove)
    }

    return new StepResponse(void 0, updates)
  },
  async (updates: VariantImageLinks[] | undefined, { container }) => {
    if (!updates?.length) {
      return
    }

    const productService = container.resolve<IProductModuleService>(Modules.PRODUCT)

    // Symmetric junction-table op: undo by swapping add/remove for the same pairs.
    const toReAdd: Array<{ variant_id: string; image_id: string }> = []
    const toReRemove: Array<{ variant_id: string; image_id: string }> = []

    for (const update of updates) {
      for (const image_id of update.remove) {
        toReAdd.push({ variant_id: update.variant_id, image_id })
      }
      for (const image_id of update.add) {
        toReRemove.push({ variant_id: update.variant_id, image_id })
      }
    }

    if (toReAdd.length) {
      await productService.addImageToVariant(toReAdd)
    }
    if (toReRemove.length) {
      await productService.removeImageFromVariant(toReRemove)
    }
  },
)
