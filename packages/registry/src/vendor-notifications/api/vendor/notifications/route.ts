import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSellerId } from "@mercurjs/core/api/utils/seller-context"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: notifications, metadata } = await query.graph({
    entity: "notification",
    fields: req.queryConfig.fields,
    filters: { channel: "seller_feed", to: getSellerId(req) },
    pagination: req.queryConfig.pagination,
  })

  res.json({
    notifications,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take,
  })
}
