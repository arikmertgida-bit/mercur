import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  emitEventStep,
} from "@medusajs/medusa/core-flows"

import {
  validateNotOwnerStep,
  validateNotSelfMemberStep,
  updateSellerMembersStep,
} from "../steps"
import { MemberAreaPermissions } from "@mercurjs/types"

import { SellerMemberWorkflowEvents } from "../../events"

export const updateMemberRoleWorkflowId = "update-member-role"

type UpdateMemberRoleWorkflowInput = {
  seller_member_id: string
  role_id: string
  /** null (or omitted) drops a custom grant, so the role template applies. */
  custom_permissions?: MemberAreaPermissions | null
  actor_seller_member_id?: string
}

export const updateMemberRoleWorkflow = createWorkflow(
  updateMemberRoleWorkflowId,
  function (input: UpdateMemberRoleWorkflowInput) {
    validateNotOwnerStep(input.seller_member_id)
    validateNotSelfMemberStep({
      seller_member_id: input.seller_member_id,
      actor_seller_member_id: input.actor_seller_member_id,
    })

    const updateInput = transform(
      { input },
      ({ input }) => ({
        selector: { id: input.seller_member_id },
        update: {
          role_id: input.role_id,
          custom_permissions: input.custom_permissions ?? null,
        },
      })
    )

    updateSellerMembersStep(updateInput)

    emitEventStep({
      eventName: SellerMemberWorkflowEvents.UPDATED,
      data: { seller_member_id: input.seller_member_id },
    })

    return new WorkflowResponse(void 0)
  }
)
