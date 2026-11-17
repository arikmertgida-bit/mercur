import { getOrderDetailWorkflow } from "@medusajs/core-flows"
import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { HttpTypes } from "@medusajs/types"
import { z } from "zod"

import { parseGraphRow } from "../../../../utils/graph-rows"
import {
  normalizeOrderPaymentCollections,
  withCartPaymentCollectionFields,
} from "../../../utils/split-order-payment-status"

const OrderOwnerRowSchema = z.object({
  id: z.string(),
  customer_id: z.string().nullish(),
  customer: z.object({ has_account: z.boolean().nullish() }).nullish(),
})

/**
 * Medusa leaves this route open so a guest can reopen their order by id.
 * An order placed by a registered customer carries their address, phone and
 * email, so only that customer may read it; guest orders keep the id-only
 * access.
 */
const assertOrderReadable = async (
  req: AuthenticatedMedusaRequest,
  orderId: string
): Promise<void> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [row],
  } = await query.graph({
    entity: "order",
    filters: { id: orderId, is_draft_order: false },
    fields: ["id", "customer_id", "customer.has_account"],
  })

  const notFound = new MedusaError(
    MedusaError.Types.NOT_FOUND,
    `Order with id: ${orderId} was not found`
  )

  if (!row) {
    throw notFound
  }

  const owner = parseGraphRow(OrderOwnerRowSchema, row)
  const requester = req.auth_context?.actor_id

  if (owner.customer?.has_account && owner.customer_id !== requester) {
    throw notFound
  }
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.StoreOrderResponse>
) => {
  await assertOrderReadable(req, req.params.id)

  const workflow = getOrderDetailWorkflow(req.scope)
  const { result } = await workflow.run({
    input: {
      fields: withCartPaymentCollectionFields(req.queryConfig.fields),
      order_id: req.params.id,
      filters: { is_draft_order: false },
    },
  })

  normalizeOrderPaymentCollections(result, req.queryConfig.fields)

  res.json({
    // @ts-expect-error -- Medusa boundary: getOrderDetailWorkflow is typed as
    // returning the module `OrderDetailDTO` while the route contract is the
    // HTTP `StoreOrder`. They differ only in serialization (BigNumber ->
    // number, optional -> nullable); Medusa's stock route returns the same
    // object.
    order: result,
  })
}
