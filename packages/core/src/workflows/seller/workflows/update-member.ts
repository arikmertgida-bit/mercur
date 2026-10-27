import {
  createHook,
  createWorkflow,
  WorkflowResponse,
  type Hook,
  type ReturnWorkflow,
} from "@medusajs/framework/workflows-sdk"
import { AdditionalData } from "@medusajs/framework/types"
import { MemberDTO } from "@mercurjs/types"

import { updateMembersStep } from "../steps"
import { QueryFilter } from "../../../utils/query-filter"

export const updateMemberWorkflowId = "update-member"

export type UpdateMemberWorkflowInput = {
  selector: QueryFilter
  update: {
    first_name?: string | null
    last_name?: string | null
    locale?: string | null
  }
} & AdditionalData

export type UpdateMemberWorkflowHooks = [
  Hook<
    "membersUpdated",
    {
      members: MemberDTO[]
      additional_data: AdditionalData["additional_data"]
    },
    void
  >,
]

export const updateMemberWorkflow: ReturnWorkflow<
  UpdateMemberWorkflowInput,
  MemberDTO[],
  UpdateMemberWorkflowHooks
> = createWorkflow(
  updateMemberWorkflowId,
  function (input: UpdateMemberWorkflowInput) {
    const members = updateMembersStep(input)

    const membersUpdated = createHook("membersUpdated", {
      members,
      additional_data: input.additional_data,
    })

    return new WorkflowResponse(members, { hooks: [membersUpdated] })
  }
)
