import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
  MiddlewareRoute,
} from "@medusajs/framework/http"
import { z } from "zod"

import { assertPromotionsCanJoinCampaign } from "../../lib/campaign-budget-attribute"

const CampaignPromotionsBodySchema = z.object({
  add: z.array(z.string()).optional(),
})

const enforceCampaignBudgetOnAdd = async (
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const body = CampaignPromotionsBodySchema.safeParse(req.body)
  const add = body.success ? body.data.add ?? [] : []

  await assertPromotionsCanJoinCampaign(req.scope, req.params.id, add)
  next()
}

export const campaignPromotionsBudgetMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/campaigns/:id/promotions",
    middlewares: [enforceCampaignBudgetOnAdd],
  },
  {
    method: ["POST"],
    matcher: "/vendor/campaigns/:id/promotions",
    middlewares: [enforceCampaignBudgetOnAdd],
  },
]
