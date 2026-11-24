import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { AdditionalData } from "@medusajs/framework/types"
import { HttpTypes } from "@mercurjs/types"

import {
  createProductsWorkflow,
  type CreateProductsWorkflowInput,
} from "../../../workflows/product/workflows/create-products"
import {
  assertSellerExists,
  assertShippingProfileOfSeller,
  assertStockLocationsOfSeller,
  requireSingleSellerId,
} from "../../../workflows/product/utils/seller-ownership"
import { enrichProductAttributes } from "../../utils"
import { AdminCreateProductType, AdminGetProductsParamsType } from "./validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetProductsParamsType>,
  res: MedusaResponse<HttpTypes.AdminProductListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products, metadata } = await query.graph({
    entity: "product",
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  })

  await enrichProductAttributes(req.scope, products)

  res.json({
    products,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminCreateProductType & AdditionalData>,
  res: MedusaResponse<HttpTypes.AdminProductResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { additional_data, ...productData } = req.validatedBody

  const sellerId = requireSingleSellerId(productData.seller_ids)
  await assertSellerExists(req.scope, sellerId)
  await assertShippingProfileOfSeller(
    req.scope,
    sellerId,
    productData.shipping_profile_id
  )
  await assertStockLocationsOfSeller(
    req.scope,
    sellerId,
    (productData.variants ?? []).flatMap((variant) =>
      (variant.inventory ?? []).map((level) => level.location_id)
    )
  )

  // A seller variant is always stock-tracked, also when the admin creates it.
  const productInput: CreateProductsWorkflowInput["products"][number] = {
    ...productData,
    seller_ids: [sellerId],
    variants: productData.variants?.map((variant) => ({
      ...variant,
      manage_inventory: true,
    })),
  }

  const { result } = await createProductsWorkflow(req.scope).run({
    input: {
      products: [productInput],
      created_by: req.auth_context.actor_id,
      additional_data,
    },
  })

  const createdId = result[0].id

  const {
    data: [product],
  } = await query.graph({
    entity: "product",
    fields: req.queryConfig.fields,
    filters: { id: createdId },
  })

  await enrichProductAttributes(req.scope, [product])

  res.status(200).json({ product })
}
