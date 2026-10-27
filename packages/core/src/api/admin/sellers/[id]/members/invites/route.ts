import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { AdminGetSellersParamsType } from "../../../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<
    Partial<AdminGetSellersParamsType>,
    AdminGetSellersParamsType
  >,
  res: MedusaResponse<HttpTypes.AdminMemberInviteListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: memberInvites, metadata } = await query.graph({
    entity: "member_invite",
    fields: req.queryConfig.fields,
    filters: {
      seller_id: req.params.id,
    },
    pagination: req.queryConfig.pagination,
  })

  res.json({
    member_invites: memberInvites,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}
