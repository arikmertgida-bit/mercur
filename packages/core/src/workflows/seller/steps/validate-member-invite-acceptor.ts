import { IAuthModuleService } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { MercurModules, MemberInviteDTO } from "@mercurjs/types"

import { MEMBER_INVITE_EMAIL_MISMATCH_CODE } from "../../../api/utils/vendor-error-codes"
import SellerModuleService from "../../../modules/seller/service"

type ValidateMemberInviteAcceptorInput = {
  invite: MemberInviteDTO
  auth_identity_id: string
  member_id?: string
}

const sameEmail = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase()

const mismatch = (): MedusaError =>
  new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    "This invite was sent to a different email address",
    MEMBER_INVITE_EMAIL_MISMATCH_CODE
  )

/**
 * The invite is accepted as the member with the invite's email, so the
 * caller must be that person: logged in as that member, or (for a new
 * member) signed in with an identity registered under that email. Without
 * this, anyone holding a token could attach a fresh login to an existing
 * member and take over every store that member belongs to.
 */
export const validateMemberInviteAcceptorStep = createStep(
  "validate-member-invite-acceptor",
  async (input: ValidateMemberInviteAcceptorInput, { container }) => {
    const sellerService = container.resolve<SellerModuleService>(
      MercurModules.SELLER
    )

    if (input.member_id) {
      const member = await sellerService.retrieveMember(input.member_id)
      if (!sameEmail(member.email, input.invite.email)) {
        throw mismatch()
      }
      return new StepResponse(undefined)
    }

    const existing = await sellerService.listMembers(
      { email: input.invite.email },
      { select: ["id"], take: 1 }
    )
    if (existing.length) {
      throw mismatch()
    }

    const authService = container.resolve<IAuthModuleService>(Modules.AUTH)
    const identity = await authService.retrieveAuthIdentity(
      input.auth_identity_id,
      { relations: ["provider_identities"] }
    )
    const matches = (identity.provider_identities ?? []).some(
      (provider) =>
        typeof provider.entity_id === "string" &&
        sameEmail(provider.entity_id, input.invite.email)
    )
    if (!matches) {
      throw mismatch()
    }

    return new StepResponse(undefined)
  }
)
