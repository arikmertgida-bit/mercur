import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { computeCampaignStatus } from "../../../../lib/campaign-status"
import { StoreGetCampaignParamsType } from "../validators"

type CampaignBudgetRow = {
  id: string
  type: string
  limit: number | null
  used: number
  currency_code: string | null
}

type CampaignSellerRow = {
  id: string
  status: string
  name: string
  handle: string
  logo: string | null
}

type CampaignRow = {
  id: string
  name: string
  description: string | null
  campaign_identifier: string
  starts_at: string | null
  ends_at: string | null
  budget: CampaignBudgetRow | null
  seller: CampaignSellerRow | null
}

export const GET = async (
  req: MedusaRequest<never, StoreGetCampaignParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const {
    data: [campaign],
  } = await query.graph({
    entity: "campaign",
    filters: { id },
    fields: req.queryConfig.fields,
  })

  const row = campaign as CampaignRow | undefined

  if (!row || (row.seller && row.seller.status !== "open")) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Campaign not found")
  }

  const { seller: _seller, ...campaignWithoutSeller } = row

  res.json({
    campaign: campaignWithoutSeller,
    seller: row.seller
      ? { id: row.seller.id, name: row.seller.name, handle: row.seller.handle, logo: row.seller.logo }
      : null,
    status: computeCampaignStatus(row),
  })
}
