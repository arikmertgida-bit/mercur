import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { JsonRecord, MercurModules } from "@mercurjs/types"

import SellerModuleService from "../../../modules/seller/service"
import { QueryFilter } from "../../../utils/query-filter"

type UpdateSellerMembersStepInput = {
  selector: QueryFilter
  update: {
    role_id?: string | null
    is_owner?: boolean
    metadata?: JsonRecord | null
  }
}

export const updateSellerMembersStep = createStep(
  "update-seller-members",
  async ({ selector, update }: UpdateSellerMembersStepInput, { container }) => {
    const service = container.resolve<SellerModuleService>(MercurModules.SELLER)
    const prev = await service.listSellerMembers(selector)

    const updated = await service.updateSellerMembers(
      prev.map((sm) => ({ id: sm.id, ...update }))
    )

    return new StepResponse(updated, prev)
  },
  async (prev, { container }) => {
    if (!prev) {
      return
    }

    const service = container.resolve<SellerModuleService>(MercurModules.SELLER)
    await service.updateSellerMembers(
      prev.map((sm) => ({
        id: sm.id,
        role_id: sm.role_id,
        is_owner: sm.is_owner,
        metadata: sm.metadata,
      }))
    )
  }
)
