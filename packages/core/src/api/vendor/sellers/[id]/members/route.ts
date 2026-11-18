import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { VendorInviteMemberType } from "../../validators"
import { validateMemberPermissionsInput } from "../../../../utils/member-permissions"
import { createMemberInvitesWorkflow } from "../../../../../workflows/seller"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.VendorSellerMemberListResponse>
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
  req: AuthenticatedMedusaRequest<VendorInviteMemberType>,
  res: MedusaResponse
) => {
  const customPermissions = validateMemberPermissionsInput(
    req,
    req.validatedBody.role_id,
    req.validatedBody.permissions
  )

  const { result: invites } = await createMemberInvitesWorkflow(req.scope).run({
    input: [{
      seller_id: req.params.id,
      email: req.validatedBody.email,
      role_id: req.validatedBody.role_id,
      custom_permissions: customPermissions,
    }],
  })

  // The token is the invitee's credential; it reaches them by email only.
  const invite = invites[0]
  res.status(201).json({
    member_invite: invite && {
      id: invite.id,
      email: invite.email,
      role_id: invite.role_id,
      custom_permissions: invite.custom_permissions,
      seller_id: invite.seller_id,
      accepted: invite.accepted,
      expires_at: invite.expires_at,
      created_at: invite.created_at,
    },
  })
}
