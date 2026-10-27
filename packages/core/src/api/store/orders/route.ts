import { getOrdersListWorkflow } from "@medusajs/core-flows"
import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { HttpTypes } from "@medusajs/types"

import {
  normalizeOrderPaymentCollections,
  withCartPaymentCollectionFields,
} from "../../utils/split-order-payment-status"

// Overrides the stock Medusa route to surface the split order payment
// collection, which lives on the cart rather than on the order link.
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.StoreOrderListResponse>
) => {
  const variables = {
    filters: {
      ...req.filterableFields,
      is_draft_order: false,
      customer_id: req.auth_context.actor_id,
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
    // @ts-expect-error -- Medusa boundary: getOrdersListWorkflow is typed as
    // returning module `OrderDTO`s while the route contract is the HTTP
    // `StoreOrder`. They differ only in serialization (BigNumber -> number,
    // optional -> nullable) and in the aggregated status fields the workflow
    // adds at runtime; Medusa's stock route returns the same rows.
    orders: rows,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}
