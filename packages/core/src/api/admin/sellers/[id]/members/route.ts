import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { HttpTypes } from "@mercurjs/types"

import {
  AdminAddSellerMemberType,
  AdminGetSellersParamsType,
} from "../../validators"
import { addSellerMemberWorkflow } from "../../../../../workflows/seller"

export const GET = async (
  req: AuthenticatedMedusaRequest<
    Partial<AdminGetSellersParamsType>,
    AdminGetSellersParamsType
  >,
  res: MedusaResponse<HttpTypes.AdminSellerMemberListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: sellerMembers, metadata } = await query.graph({
    entity: "seller_member",
    fields: req.queryConfig.fields,
    filters: {
      seller_id: req.params.id,
    },
    pagination: req.queryConfig.pagination,
  })

  res.json({
    seller_members: sellerMembers,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminAddSellerMemberType>,
  res: MedusaResponse
) => {
  const { result } = await addSellerMemberWorkflow(req.scope).run({
    input: {
      seller_id: req.params.id,
      member_id: req.validatedBody.member_id,
      role_id: req.validatedBody.role_id,
    },
  })

  res.status(201).json({ seller_member: result })
}
