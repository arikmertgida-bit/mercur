import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { batchSellerProductVariantsWorkflow } from "../../../../../../workflows/product/workflows/batch-seller-product-variants"
import {
  assertStockLocationsOfSeller,
  getProductSellerId,
} from "../../../../../../workflows/product/utils/seller-ownership"
import { AdminBatchProductVariantsType } from "../../../validators"

type BatchVariantsResponse = {
  created: HttpTypes.AdminProductVariant[]
  updated: HttpTypes.AdminProductVariant[]
  deleted: { ids: string[]; object: "variant"; deleted: true }
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminBatchProductVariantsType>,
  res: MedusaResponse<BatchVariantsResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const productId = req.params.id
  const { create = [], update = [], delete: remove = [] } = req.validatedBody

  const sellerId = await getProductSellerId(req.scope, productId)
  await assertStockLocationsOfSeller(
    req.scope,
    sellerId,
    create.flatMap((variant) =>
      (variant.inventory ?? []).map((level) => level.location_id)
    )
  )

  const { result } = await batchSellerProductVariantsWorkflow(req.scope).run({
    input: {
      seller_id: sellerId,
      create: create.map(({ inventory = [], ...variant }) => ({
        inventory,
        variant: {
          ...variant,
          sku: variant.sku ?? undefined,
          ean: variant.ean ?? undefined,
          upc: variant.upc ?? undefined,
          barcode: variant.barcode ?? undefined,
          hs_code: variant.hs_code ?? undefined,
          mid_code: variant.mid_code ?? undefined,
          material: variant.material ?? undefined,
          length: variant.length ?? undefined,
          height: variant.height ?? undefined,
          width: variant.width ?? undefined,
          weight: variant.weight ?? undefined,
          origin_country: variant.origin_country ?? undefined,
          metadata: variant.metadata ?? undefined,
          product_id: productId,
        },
      })),
      update: update.map((variant) => ({ ...variant, product_id: productId })),
      delete: remove,
    },
  })

  const fetchVariants = async (
    ids: string[]
  ): Promise<HttpTypes.AdminProductVariant[]> => {
    if (!ids.length) {
      return []
    }
    const { data } = await query.graph({
      entity: "variant",
      fields: req.queryConfig.fields,
      filters: { id: ids },
    })
    return data
  }

  res.status(200).json({
    created: await fetchVariants(result.created),
    updated: await fetchVariants(result.updated),
    deleted: { ids: result.deleted, object: "variant", deleted: true },
  })
}
