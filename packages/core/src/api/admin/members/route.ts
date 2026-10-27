import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { AdminGetMembersParamsType } from "./validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<
    Partial<AdminGetMembersParamsType>,
    AdminGetMembersParamsType
  >,
  res: MedusaResponse<HttpTypes.AdminMemberListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: members, metadata } = await query.graph({
    entity: "member",
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    members,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}
