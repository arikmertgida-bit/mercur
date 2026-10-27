import { getOrdersListWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import {
  normalizeOrderPaymentCollections,
  withCartPaymentCollectionFields,
} from "./helpers"
import { toHttpOrder } from "../../../utils/http-order"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.VendorOrderListResponse>
) => {
  const variables = {
    filters: {
      ...req.filterableFields,
      is_draft_order: false,
    },
    ...req.queryConfig.pagination,
  }

  const workflow = getOrdersListWorkflow(req.scope)
  const { result } = await workflow.run({
    input: {
      fields: withCartPaymentCollectionFields(req.queryConfig.fields),
      variables,
    },
  })

  if (!("rows" in result)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Expected paginated orders result"
    )
  }
  const { rows, metadata } = result

  rows.forEach((order) => normalizeOrderPaymentCollections(order))

  res.json({
    orders: rows.map(toHttpOrder),
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}
