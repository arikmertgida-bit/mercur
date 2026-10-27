import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import { ensureDefined } from "@mercurjs/core/utils/ensure-defined"

import { MESSAGING_MODULE } from "../../../../../modules/messaging"
import type MessagingModuleService from "../../../../../modules/messaging/service"
import { unblockCustomerWorkflow } from "../../../../../workflows/messaging/workflows/unblock-customer"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<MessagingModuleService>(MESSAGING_MODULE)
  const customerId = ensureDefined(req.params.customer_id, "Customer id")
  const blocked = await service.checkBuyersBlocked([customerId])

  res.json({ is_blocked: blocked.has(customerId) })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  await unblockCustomerWorkflow.run({
    container: req.scope,
    input: { customer_id: ensureDefined(req.params.customer_id, "Customer id") },
  })

  res.status(200).json({ success: true })
}
