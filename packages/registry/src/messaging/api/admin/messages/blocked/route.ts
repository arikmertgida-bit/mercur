import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import { MESSAGING_FILTERS_MODULE } from "../../../../modules/messaging-filters"
import type MessagingFiltersModuleService from "../../../../modules/messaging-filters/service"
import { AdminListBlockedType } from "../filters/validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<Partial<AdminListBlockedType>, AdminListBlockedType>,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<MessagingFiltersModuleService>(
    MESSAGING_FILTERS_MODULE
  )

  const { limit, sender_type } = req.validatedQuery
  const filters = sender_type ? { sender_type } : {}

  const [logs, count] = await service.listAndCountBlockedMessageLogs(
    filters,
    {
      take: limit,
      order: { created_at: "DESC" },
    }
  )

  res.json({ blocked_messages: logs, count })
}
