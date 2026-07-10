import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { MemberDTO, MercurModules } from "@mercurjs/types"

import SellerModuleService from "../../../modules/seller/service"

type UpsertMembersInput = {
  email: string
  first_name?: string | null
  last_name?: string | null
}[]

type UpsertMembersCompensateInput = {
  newIds: string[]
  previousMembers: MemberDTO[]
}

export const upsertMembersStep = createStep(
  "upsert-members",
  async (data: UpsertMembersInput, { container }) => {
    const service = container.resolve<SellerModuleService>(MercurModules.SELLER)

    // upsertMembers() creates-or-fills-in-blanks per email — snapshot the
    // prior rows so compensate can tell new members (delete) apart from
    // pre-existing ones whose blank name fields may have been filled in
    // (restore).
    const previousMembers = await service.listMembers({
      email: data.map((d) => d.email),
    })
    const previousEmails = new Set(previousMembers.map((m) => m.email))

    const members = await service.upsertMembers(data)

    return new StepResponse(members, {
      newIds: members
        .filter((m) => !previousEmails.has(m.email))
        .map((m) => m.id),
      previousMembers,
    })
  },
  async (compensateInput: UpsertMembersCompensateInput | undefined, { container }) => {
    if (!compensateInput) {
      return
    }

    const service = container.resolve<SellerModuleService>(MercurModules.SELLER)
    const { newIds, previousMembers } = compensateInput

    if (newIds.length) {
      await service.deleteMembers(newIds)
    }
    if (previousMembers.length) {
      await service.updateMembers(
        previousMembers.map((m) => ({
          id: m.id,
          first_name: m.first_name,
          last_name: m.last_name,
        }))
      )
    }
  }
)
