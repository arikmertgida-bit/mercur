import {
  createHook,
  createWorkflow,
  transform,
  WorkflowResponse,
  type Hook,
  type ReturnWorkflow,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import { SellerDTO, UpdateSellerDTO } from "@mercurjs/types"
import { AdditionalData } from "@medusajs/framework/types"

import { updateSellersStep } from "../steps"
import { SellerWorkflowEvents } from "../../events"
import { QueryFilter } from "../../../utils/query-filter"

export const updateSellersWorkflowId = "update-sellers"

export type UpdateSellersWorkflowInput = {
  selector: QueryFilter
  update: UpdateSellerDTO
} & AdditionalData

export type UpdateSellersWorkflowHooks = [
  Hook<
    "sellersUpdated",
    {
      sellers: SellerDTO[]
      additional_data: AdditionalData["additional_data"]
    },
    void
  >,
]

export const updateSellersWorkflow: ReturnWorkflow<
  UpdateSellersWorkflowInput,
  SellerDTO[],
  UpdateSellersWorkflowHooks
> = createWorkflow(
  updateSellersWorkflowId,
  function (input: UpdateSellersWorkflowInput) {
    const sellers = updateSellersStep(input)

    const sellersUpdated = createHook("sellersUpdated", {
      sellers,
      additional_data: input.additional_data,
    })

    const eventData = transform({ sellers }, ({ sellers }) =>
      sellers.map((s) => ({ id: s.id }))
    )

    emitEventStep({
      eventName: SellerWorkflowEvents.UPDATED,
      data: eventData,
    })

    return new WorkflowResponse(sellers, { hooks: [sellersUpdated] })
  }
)
