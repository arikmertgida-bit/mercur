import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import {
  MemberAreaPermissions,
  MemberInviteDTO,
  MercurModules,
} from "@mercurjs/types"

import SellerModuleService from "../../../modules/seller/service"

type CreateMemberInviteStepInput = {
  seller_id: string
  email: string
  role_id: string
  custom_permissions?: MemberAreaPermissions | null
}

export const createMemberInvitesStep = createStep(
  "create-member-invites",
  async (input: CreateMemberInviteStepInput[], { container }) => {
    const service = container.resolve<SellerModuleService>(MercurModules.SELLER)

    const invites: MemberInviteDTO[] = await service.createMemberInvites(input)

    return new StepResponse(invites, invites.map((inv) => inv.id))
  },
  async (ids: string[], { container }) => {
    if (!ids?.length) {
      return
    }

    const service = container.resolve<SellerModuleService>(MercurModules.SELLER)
    await service.deleteMemberInvites(ids)
  }
)
