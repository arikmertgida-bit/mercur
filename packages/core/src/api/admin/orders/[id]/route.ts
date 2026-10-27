import { getOrderDetailWorkflow } from "@medusajs/core-flows"
import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { HttpTypes } from "@medusajs/types"

import {
  normalizeOrderPaymentCollections,
  withCartPaymentCollectionFields,
} from "../../../utils/split-order-payment-status"

// Only GET is overridden. Medusa resolves duplicate routes per method, so the
// stock POST would keep working on its own — but the generated route manifest
// maps a path to a single module, so it has to be re-exported here for the
// typed client to keep seeing it.
export { POST } from "@medusajs/medusa/api/admin/orders/[id]/route"

type AdminGetOrderQuery = { version?: number }

export const GET = async (
  req: AuthenticatedMedusaRequest<never, AdminGetOrderQuery>,
  res: MedusaResponse<HttpTypes.AdminOrderResponse>
) => {
  const workflow = getOrderDetailWorkflow(req.scope)
  const { result } = await workflow.run({
    input: {
      fields: withCartPaymentCollectionFields(req.queryConfig.fields),
      order_id: req.params.id,
      version: req.validatedQuery.version,
    },
  })

  normalizeOrderPaymentCollections(result)

  res.json({
    // @ts-expect-error -- Medusa boundary: getOrderDetailWorkflow is typed as
    // returning the module `OrderDetailDTO` while the route contract is the
    // HTTP `AdminOrder`. They differ only in serialization (BigNumber ->
    // number, optional -> nullable); Medusa's stock route returns the same
    // object.
    order: result,
  })
}
