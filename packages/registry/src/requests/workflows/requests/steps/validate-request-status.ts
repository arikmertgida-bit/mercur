import { createStep } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { RequestCustomFields, RequestStatus } from "../../../types"
import { Query } from "@mercurjs/types"

type ValidateRequestStatusStepInput = {
  alias: string
  entity_id: string
  expected_status: RequestStatus | RequestStatus[]
}

type RequestEntityGraph = {
  id: string
  custom_fields?: RequestCustomFields
}

export const validateRequestStatusStep = createStep(
  "validate-request-status",
  async (input: ValidateRequestStatusStepInput, { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const {
      data: [entity],
    } = await query.graph({
      entity: input.alias,
      fields: ["id", "custom_fields.*"],
      filters: { id: input.entity_id },
    })

    if (!entity) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Request not found")
    }

    const requestEntity = entity as RequestEntityGraph
    const status = requestEntity.custom_fields?.request_status

    const expected = Array.isArray(input.expected_status)
      ? input.expected_status
      : [input.expected_status]

    if (!status || !expected.includes(status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Request status must be ${expected.join(" or ")}, but is ${status}`
      )
    }
  }
)
