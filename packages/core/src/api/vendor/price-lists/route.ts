import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PriceListDTO } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { createSellerPriceListsWorkflow } from "../../../workflows/price-list"
import { transformPriceList } from "./helpers"
import { toHttpPriceList } from "../../../utils/http-price-list"
import {
  VendorCreatePriceListType,
  VendorGetPriceListsParamsType,
} from "./validators"
import { getSellerId } from "../../utils/seller-context"

export const GET = async (
  req: AuthenticatedMedusaRequest<
    Partial<VendorGetPriceListsParamsType>,
    VendorGetPriceListsParamsType
  >,
  res: MedusaResponse<HttpTypes.VendorPriceListListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data, metadata } = await query.graph({
    entity: "price_list",
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  })
  // Passed through with the requested fields.
  const priceLists: PriceListDTO[] = data

  res.json({
    price_lists: priceLists.map((priceList) =>
      toHttpPriceList(transformPriceList(priceList))
    ),
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorCreatePriceListType>,
  res: MedusaResponse<HttpTypes.VendorPriceListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const sellerId = getSellerId(req)

  const { result } = await createSellerPriceListsWorkflow(req.scope).run({
    input: {
      price_lists_data: [req.validatedBody],
      seller_id: sellerId,
    },
  })

  const { data: created } = await query.graph({
    entity: "price_list",
    fields: req.queryConfig.fields,
    filters: { id: result[0].id },
  })
  const priceList: PriceListDTO = created[0]

  res.status(201).json({
    price_list: toHttpPriceList(transformPriceList(priceList)),
  })
}
