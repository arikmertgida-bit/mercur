import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { HttpTypes } from "@mercurjs/types"

import { AdminInviteSellerMemberType } from "../../../validators"
import { toPublicMemberInvite } from "../../../../../utils"
import { createMemberInvitesWorkflow } from "../../../../../../workflows/seller"

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminInviteSellerMemberType>,
  res: MedusaResponse<HttpTypes.AdminMemberInviteResponse>
) => {
  const { result: invites } = await createMemberInvitesWorkflow(
    req.scope
  ).run({
    input: [
      {
        seller_id: req.params.id,
        email: req.validatedBody.email,
        role_id: req.validatedBody.role_id,
      },
    ],
  })

  res.status(201).json({ member_invite: toPublicMemberInvite(invites[0]) })
}
