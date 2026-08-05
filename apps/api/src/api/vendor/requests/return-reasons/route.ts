import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import {
  VendorRequestListResponse,
  VendorRequestResponse,
  isRequestEntity,
  parseRequestEntity,
  parseRequestEntitySafe,
} from "../../../../types/requests"
import { createReturnReasonRequestWorkflow } from "../../../../workflows/requests/workflows"
import { VendorCreateReturnReasonRequestType, VendorGetReturnReasonRequestsParamsType } from "./validators"

export async function GET(
  req: AuthenticatedMedusaRequest<VendorGetReturnReasonRequestsParamsType>,
  res: MedusaResponse<VendorRequestListResponse>
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: entities, metadata } = await query.graph({
    entity: "return_reason",
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  })

  const requests = entities.map(parseRequestEntitySafe).filter(isRequestEntity)

  res.json({
    requests,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest<VendorCreateReturnReasonRequestType>,
  res: MedusaResponse<VendorRequestResponse>
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { result: returnReason } = await createReturnReasonRequestWorkflow(req.scope).run({
    input: {
      return_reason: req.validatedBody,
      submitter_id: req.auth_context.actor_id,
    },
  })

  const {
    data: [entity],
  } = await query.graph({
    entity: "return_reason",
    fields: req.queryConfig.fields,
    filters: { id: returnReason.id },
  })

  if (!entity) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Request not found")
  }

  res.status(201).json({ request: parseRequestEntity(entity) })
}
