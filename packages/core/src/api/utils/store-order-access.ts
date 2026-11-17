import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

import { parseGraphRow } from "../../utils/graph-rows"

const OrderOwnerRowSchema = z.object({
  id: z.string(),
  customer_id: z.string().nullish(),
  customer: z.object({ has_account: z.boolean().nullish() }).nullish(),
})

/**
 * Medusa leaves the store order routes (detail, return creation) open so a
 * guest can act on their order with its id alone. An order placed by a
 * registered customer carries their address, phone and email, so only that
 * customer may read it or open a return on it; guest orders keep the id-only
 * access. Unknown and foreign orders both answer 404.
 */
export const assertStoreOrderAccess = async (
  scope: MedusaContainer,
  orderId: string,
  requesterCustomerId: string | undefined
): Promise<void> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
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

  if (owner.customer?.has_account && owner.customer_id !== requesterCustomerId) {
    throw notFound
  }
}
