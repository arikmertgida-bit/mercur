import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { IRbacModuleService } from "@medusajs/types"
import { ensureSellerDefaultRoles } from "../../../modules/seller/utils/ensure-seller-default-roles"

export const createSellerDefaultRolesStepId = "create-seller-default-roles"

export const createSellerDefaultRolesStep = createStep(
  createSellerDefaultRolesStepId,
  async (_: void, { container }) => {
    const rbacService: IRbacModuleService = container.resolve(Modules.RBAC)
    const roles = await ensureSellerDefaultRoles(rbacService)

    return new StepResponse(roles)
  },
  // Deliberate no-op: SELLER_ROLES are global, platform-wide RBAC role
  // definitions shared by every seller, not per-seller data owned by this
  // workflow run. Deleting them on rollback would strip role access from
  // every *other* seller already using them — worse than doing nothing.
  async () => {
    return
  },
)
