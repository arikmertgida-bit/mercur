import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { CreateOnboardingDTO, MercurModules, OnboardingDTO } from "@mercurjs/types"

import PayoutModuleService from "../../../modules/payout/services/payout-module-service"

type CreateOnboardingCompensateInput = {
  id: string
  previousOnboarding: Pick<OnboardingDTO, "id" | "data" | "context"> | null
}

export const createOnboardingStep = createStep(
  "create-onboarding",
  async (input: CreateOnboardingDTO, { container }) => {
    const service = container.resolve<PayoutModuleService>(MercurModules.PAYOUT)

    // createOnboarding() itself creates-or-updates depending on whether the
    // account already has an onboarding record — snapshot the prior state
    // so compensate can tell which behavior actually happened.
    const payoutAccount = await service.retrievePayoutAccount(input.account_id, {
      relations: ["onboarding"],
    })
    const previousOnboarding = payoutAccount.onboarding
      ? {
          id: payoutAccount.onboarding.id,
          data: payoutAccount.onboarding.data,
          context: payoutAccount.onboarding.context,
        }
      : null

    const onboarding: OnboardingDTO = await service.createOnboarding(input)

    return new StepResponse(onboarding, { id: onboarding.id, previousOnboarding })
  },
  async (compensateInput: CreateOnboardingCompensateInput | undefined, { container }) => {
    if (!compensateInput) {
      return
    }

    const service = container.resolve<PayoutModuleService>(MercurModules.PAYOUT)
    const { id, previousOnboarding } = compensateInput

    if (previousOnboarding) {
      await service.updateOnboardings({
        id: previousOnboarding.id,
        data: previousOnboarding.data,
        context: previousOnboarding.context,
      })
    } else {
      await service.deleteOnboardings(id)
    }
  }
)
