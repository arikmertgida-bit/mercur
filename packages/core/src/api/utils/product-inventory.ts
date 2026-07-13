import type { MedusaStoreRequest } from "@medusajs/framework/http"
import { wrapVariantsWithInventoryQuantityForSalesChannel } from "@medusajs/medusa/api/utils/middlewares/index"

type InventoryTrackedVariant = {
  id: string
  manage_inventory?: boolean | null
  inventory_quantity?: number | null
}

type InventoryTrackedProduct = {
  variants?: InventoryTrackedVariant[] | null
}

/**
 * Sets each variant's `inventory_quantity` in place, scoped to the sales
 * channel resolved from the request's publishable key (vanilla Medusa's own
 * behavior — reused here as-is via `@medusajs/medusa`'s exported
 * middleware helper). Mercur's `/store/products` route replaces vanilla's
 * whole route body, so this wrapping isn't applied for free the way it is
 * upstream; this restores parity.
 *
 * The vanilla helper's `VariantInput` type has no `null` in
 * `manage_inventory`/`inventory_quantity` (graph results do, since both
 * columns are nullable), so it's called against normalized copies and the
 * computed quantity is copied back onto the original variant objects.
 */
export const wrapProductVariantsWithInventoryQuantity = async (
  req: MedusaStoreRequest<unknown>,
  products: InventoryTrackedProduct[]
): Promise<void> => {
  const originalVariants = products.flatMap(
    (product) => product.variants ?? []
  )
  if (!originalVariants.length) {
    return
  }

  const wrapperInput = originalVariants.map((variant) => ({
    id: variant.id,
    manage_inventory: variant.manage_inventory ?? undefined,
    inventory_quantity: variant.inventory_quantity ?? undefined,
  }))

  await wrapVariantsWithInventoryQuantityForSalesChannel(req, wrapperInput)

  const quantityById = new Map(
    wrapperInput.map((variant) => [variant.id, variant.inventory_quantity])
  )
  for (const variant of originalVariants) {
    variant.inventory_quantity = quantityById.get(variant.id) ?? null
  }
}
