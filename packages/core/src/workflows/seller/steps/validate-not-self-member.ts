import { createStep } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"

export type ValidateNotSelfMemberStepInput = {
  seller_member_id: string
  actor_seller_member_id?: string
}

export const validateNotSelfMemberStep = createStep(
  "validate-not-self-member",
  async ({
    seller_member_id,
    actor_seller_member_id,
  }: ValidateNotSelfMemberStepInput) => {
    if (actor_seller_member_id && actor_seller_member_id === seller_member_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Members cannot change their own role"
      )
    }
  }
)
