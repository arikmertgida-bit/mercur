import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { CreateOrderGroupDTO, MercurModules, OrderGroupDTO } from "@mercurjs/types"

import SellerModuleService from "../../../modules/seller/service"

type CreateOrderGroupStepInput = CreateOrderGroupDTO
type CreateOrderGroupStepCompensateInput = string | null

export type CreateOrderGroupStepOutput = {
  orderGroup: OrderGroupDTO
  // false when a concurrent request for the same cart won the race and this
  // execution recovered its row instead of creating a new one — callers must
  // skip all further order/inventory/payment work in that case.
  wasCreated: boolean
}

export const createOrderGroupStep = createStep(
  "create-order-group",
  async (
    input: CreateOrderGroupStepInput,
    { container }
  ): Promise<StepResponse<CreateOrderGroupStepOutput, CreateOrderGroupStepCompensateInput>> => {
    const service = container.resolve<SellerModuleService>(MercurModules.SELLER)

    try {
      const created = await service.createOrderGroups(input)
      const orderGroup = await service.retrieveOrderGroup(created.id)

      return new StepResponse(
        { orderGroup, wasCreated: true },
        orderGroup.id
      )
    } catch (error) {
      // `order_group.cart_id` carries a real unique constraint (see
      // Migration20260905120000): two genuinely concurrent completions for
      // the same cart can both pass the workflow's own "does a group already
      // exist" read before either commits, so the loser's INSERT fails here
      // instead. Recover by returning the row the winner just created,
      // matching this workflow's documented per-cart idempotency contract —
      // any other failure (no matching row appears) is a real error and is
      // rethrown unchanged.
      const [existingOrderGroup] = await service.listOrderGroups(
        { cart_id: input.cart_id },
        { take: 1 }
      )

      if (!existingOrderGroup) {
        throw error
      }

      // Explicit `null` (not omitted): omitting the compensate input falls
      // back to the full output object as the compensate argument, which
      // would hand the row we did NOT create to `deleteOrderGroups`.
      return new StepResponse(
        { orderGroup: existingOrderGroup, wasCreated: false },
        null
      )
    }
  },
  async (id, { container }) => {
    if (!id) {
      return
    }

    const service = container.resolve<SellerModuleService>(MercurModules.SELLER)

    await service.deleteOrderGroups([id])
  }
)
