import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { isSellerVisible } from "@mercurjs/core/api/utils/sellers"

import { computeCampaignStatus } from "../../../../lib/campaign-status"
import { StoreGetCampaignParamsType } from "../validators"

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

  const row = campaign

  if (!row || (row.seller && !isSellerVisible(row.seller, new Date()))) {
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
