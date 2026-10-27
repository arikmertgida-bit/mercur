import { z } from "zod"
import { cancelBeginOrderClaimWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { confirmClaimRequestWorkflow } from "../../../../../workflows/order/workflows/confirm-claim-request"
import { parseGraphRow } from "../../../../../utils/graph-rows"
import { toHttpOrderPreview } from "../../../../../utils/http-order"

const ReturnRefRowSchema = z.object({ return_id: z.string().nullish() })

const RETURN_FIELDS = [
  "id",
  "order_id",
  "exchange_id",
  "claim_id",
  "display_id",
  "location_id",
  "order_version",
  "status",
  "metadata",
  "no_notification",
  "refund_amount",
  "created_by",
  "created_at",
  "updated_at",
  "canceled_at",
  "requested_at",
  "received_at",
  "items.*",
  "items.reason.*",
]

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.AdminClaimRequestResponse>
) => {
  const { id } = req.params

  const { result } = await confirmClaimRequestWorkflow(req.scope).run({
    input: {
      claim_id: id,
      confirmed_by: req.auth_context.actor_id,
    },
  })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [orderClaim],
  } = await query.graph({
    entity: "order_claim",
    fields: req.queryConfig.fields,
    filters: {
      id,
      ...req.filterableFields,
    },
  })

  let orderReturn: HttpTypes.AdminReturn | undefined
  const returnId = orderClaim
    ? parseGraphRow(ReturnRefRowSchema, orderClaim).return_id
    : undefined
  if (returnId) {
    const { data: returns } = await query.graph({
      entity: "return",
      fields: RETURN_FIELDS,
      filters: { id: returnId },
    })
    orderReturn = returns?.[0]
  }

  res.json({
    order_preview: toHttpOrderPreview(result),
    claim: orderClaim,
    // @ts-expect-error — Medusa's HTTP type declares `return` as always
    // present, but a claim without inbound items has no return; Medusa's own
    // core route sends `undefined` here too.
    return: orderReturn,
  })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.AdminClaimDeleteResponse>
) => {
  const { id } = req.params

  await cancelBeginOrderClaimWorkflow(req.scope).run({
    input: { claim_id: id },
  })

  res.status(200).json({
    id,
    object: "claim",
    deleted: true,
  })
}
