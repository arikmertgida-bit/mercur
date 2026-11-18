import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { JsonRecord, MemberAreaPermissions, MercurModules } from "@mercurjs/types"

import SellerModuleService from "../../../modules/seller/service"
import { QueryFilter } from "../../../utils/query-filter"

type SellerMemberRows = Awaited<
  ReturnType<SellerModuleService["listSellerMembers"]>
>

type SellerMemberUpdate = {
  role_id?: string | null
  custom_permissions?: MemberAreaPermissions | null
  is_owner?: boolean
  metadata?: JsonRecord | null
}

type UpdateSellerMembersStepInput = {
  selector: QueryFilter
  update: SellerMemberUpdate
}

/**
 * Medusa merges json columns on update, so writing a grant over an older one
 * would keep every right the new grant leaves out. Clearing it first makes the
 * new grant replace the old one.
 */
async function writeSellerMembers(
  service: SellerModuleService,
  rows: (SellerMemberUpdate & { id: string })[]
): Promise<SellerMemberRows> {
  const replacing = rows.filter((row) => row.custom_permissions)
  if (replacing.length) {
    await service.updateSellerMembers(
      replacing.map((row) => ({ id: row.id, custom_permissions: null }))
    )
  }
  return await service.updateSellerMembers(rows)
}

export const updateSellerMembersStep = createStep(
  "update-seller-members",
  async ({ selector, update }: UpdateSellerMembersStepInput, { container }) => {
    const service = container.resolve<SellerModuleService>(MercurModules.SELLER)
    const prev = await service.listSellerMembers(selector)

    const updated = await writeSellerMembers(
      service,
      prev.map((sm) => ({ id: sm.id, ...update }))
    )

    return new StepResponse(updated, prev)
  },
  async (prev, { container }) => {
    if (!prev) {
      return
    }

    const service = container.resolve<SellerModuleService>(MercurModules.SELLER)
    await writeSellerMembers(
      service,
      prev.map((sm) => ({
        id: sm.id,
        role_id: sm.role_id,
        custom_permissions: sm.custom_permissions,
        is_owner: sm.is_owner,
        metadata: sm.metadata,
      }))
    )
  }
)
