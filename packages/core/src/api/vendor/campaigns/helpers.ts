import { MedusaContainer } from "@medusajs/framework"
import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "zod"

import { parseGraphRows } from "../../../utils/graph-rows"
import { QueryFilter } from "../../../utils/query-filter"

type CampaignFilter = QueryFilter

type CampaignFilterFields = QueryFilter & {
  budget_type?: string
  status?: string
  $and?: QueryFilter[]
}

const CampaignIdRowSchema = z.object({ campaign_id: z.string() })

const buildStatusFilter = (
  status: string,
  now: Date
): CampaignFilter | undefined => {
  switch (status) {
    case "expired":
      return { ends_at: { $lt: now } }
    case "scheduled":
      return {
        starts_at: { $gt: now },
        $or: [{ ends_at: null }, { ends_at: { $gte: now } }],
      }
    case "active":
      return {
        $and: [
          { $or: [{ starts_at: null }, { starts_at: { $lte: now } }] },
          { $or: [{ ends_at: null }, { ends_at: { $gte: now } }] },
        ],
      }
    default:
      return undefined
  }
}

/**
 * Translates the `budget_type` and `status` query params into real
 * `campaign` constraints, mirroring the admin campaigns middleware:
 * `budget_type` is resolved through the `campaign_budget` link (never a
 * nested relation filter) and `status` becomes a null-aware date range.
 * Both are appended to `$and` so the seller link filter is preserved.
 */
export const applyCampaignFilters = async (
  req: AuthenticatedMedusaRequest<never, CampaignFilterFields>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const filterableFields = req.filterableFields ?? {}

  const budgetType = filterableFields.budget_type
  const status = filterableFields.status

  delete filterableFields.budget_type
  delete filterableFields.status

  if (!budgetType && !status) {
    return next()
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const constraints: CampaignFilter[] = []

  if (budgetType) {
    const { data } = await query.graph({
      entity: "campaign_budget",
      fields: ["campaign_id"],
      filters: { type: budgetType },
    })
    const budgetIds = parseGraphRows(CampaignIdRowSchema, data).map(
      (b) => b.campaign_id
    )

    if (!budgetIds.length) {
      filterableFields.id = ["__no_match__"]
      return next()
    }

    constraints.push({ id: { $in: budgetIds } })
  }

  if (status) {
    const statusFilter = buildStatusFilter(status, new Date())
    if (statusFilter) {
      constraints.push(statusFilter)
    }
  }

  if (constraints.length) {
    const existingAnd = filterableFields.$and ?? []
    filterableFields.$and = [...existingAnd, ...constraints]
  }

  return next()
}

export const refetchCampaign = async (
  campaignId: string,
  scope: MedusaContainer,
  fields: string[]
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [campaign],
  } = await query.graph({
    entity: "campaign",
    filters: { id: campaignId },
    fields,
  })

  return campaign
}

export const validateSellerCampaign = async (
  scope: MedusaContainer,
  sellerId: string,
  campaignId: string
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [sellerCampaign],
  } = await query.graph({
    entity: "campaign_seller",
    filters: {
      seller_id: sellerId,
      campaign_id: campaignId,
    },
    fields: ["seller_id"],
  })

  if (!sellerCampaign) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Campaign with id: ${campaignId} was not found`
    )
  }
}
