import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isSellerVisible } from "@mercurjs/core/api/utils/sellers"

import { computeCampaignStatus, CampaignComputedStatus } from "../../../lib/campaign-status"
import { StoreGetCampaignsParamsType } from "./validators"

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
  closed_from: string | null
  closed_to: string | null
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
  req: MedusaRequest<never, StoreGetCampaignsParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { status, limit, offset } = req.validatedQuery

  const { data: campaigns } = await query.graph({
    entity: "campaign",
    fields: [
      "id",
      "name",
      "description",
      "campaign_identifier",
      "starts_at",
      "ends_at",
      "budget.*",
      "seller.id",
      "seller.status",
      "seller.closed_from",
      "seller.closed_to",
    ],
  })

  const wantedStatus: CampaignComputedStatus = status === "upcoming" ? "scheduled" : "active"
  const now = new Date()

  const rows = campaigns as CampaignRow[]

  const visible = rows.filter((campaign) => {
    if (campaign.seller && !isSellerVisible(campaign.seller, now)) {
      return false
    }
    return computeCampaignStatus(campaign) === wantedStatus
  })

  const sorted = [...visible].sort((a, b) => {
    if (wantedStatus === "scheduled") {
      const aStart = a.starts_at ? new Date(a.starts_at).getTime() : 0
      const bStart = b.starts_at ? new Date(b.starts_at).getTime() : 0
      return aStart - bStart
    }
    const aEnd = a.ends_at ? new Date(a.ends_at).getTime() : Number.MAX_SAFE_INTEGER
    const bEnd = b.ends_at ? new Date(b.ends_at).getTime() : Number.MAX_SAFE_INTEGER
    return aEnd - bEnd
  })

  const paged = sorted.slice(offset, offset + limit)

  res.json({
    campaigns: paged.map(({ seller: _seller, ...rest }) => rest),
    count: visible.length,
    limit,
    offset,
  })
}
