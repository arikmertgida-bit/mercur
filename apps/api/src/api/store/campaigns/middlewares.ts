import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformQuery } from "@medusajs/framework"

import { storeCampaignsQueryConfig } from "./query-config"
import { StoreGetCampaignParams, StoreGetCampaignsParams } from "./validators"

export const storeCampaignsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/campaigns",
    middlewares: [
      validateAndTransformQuery(StoreGetCampaignsParams, storeCampaignsQueryConfig.list),
    ],
  },
  {
    method: ["GET"],
    matcher: "/store/campaigns/:id",
    middlewares: [
      validateAndTransformQuery(StoreGetCampaignParams, storeCampaignsQueryConfig.retrieve),
    ],
  },
]
