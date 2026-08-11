import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import { HttpTypes } from "@mercurjs/types"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.StoreOrderResponse>
) => {
  const customerId = req.auth_context.actor_id
  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    filters: { id, customer_id: customerId },
    fields: ["id"],
  })

  if (!order) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order with id ${id} was not found`
    )
  }

  await cancelOrderWorkflow(req.scope).run({
    input: {
      order_id: id,
      canceled_by: customerId,
    },
  })

  const {
    data: [canceledOrder],
  } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "status",
      "canceled_at",
      "fulfillment_status",
      "payment_status",
      "display_id",
      "email",
    ],
    filters: { id },
  })

  res.json({ order: canceledOrder })
}
