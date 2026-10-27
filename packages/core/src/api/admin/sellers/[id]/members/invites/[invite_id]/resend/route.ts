import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@mercurjs/types"

import { resendMemberInviteWorkflow } from "../../../../../../../../workflows/seller"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.AdminMemberInviteResponse>
) => {
  const { result } = await resendMemberInviteWorkflow(req.scope).run({
    input: {
      invite_id: req.params.invite_id,
      seller_id: req.params.id,
    },
  })

  const invite = result[0]

  res.status(200).json({
    member_invite: invite,
  })
}
