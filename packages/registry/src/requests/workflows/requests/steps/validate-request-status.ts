import { createStep } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { parseGraphRow } from "@mercurjs/core/utils/graph-rows"
import { Query } from "@mercurjs/types"
import { z } from "zod"

import { RequestStatus } from "../../../types"

type ValidateRequestStatusStepInput = {
  alias: string
  entity_id: string
  expected_status: RequestStatus | RequestStatus[]
}

const RequestEntityStatusRowSchema = z.object({
  id: z.string(),
  custom_fields: z
    .object({ request_status: z.nativeEnum(RequestStatus) })
    .nullish(),
})

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

    const requestEntity = parseGraphRow(RequestEntityStatusRowSchema, entity)
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
