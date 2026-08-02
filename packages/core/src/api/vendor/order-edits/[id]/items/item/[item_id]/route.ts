import { orderEditUpdateItemQuantityWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { VendorPostOrderEditsUpdateItemQuantityReqType } from "../../../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostOrderEditsUpdateItemQuantityReqType>,
  res: MedusaResponse<HttpTypes.AdminOrderEditPreviewResponse>
) => {
  const { id, item_id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: ["id", "items.id"],
    filters: { id },
  })

  const itemBelongsToOrder = order?.items?.some((item) => item.id === item_id)
  if (!itemBelongsToOrder) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Item with id: ${item_id} was not found in order: ${id}`
    )
  }

  const { result } = await orderEditUpdateItemQuantityWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      order_id: id,
      items: [
        {
          ...req.validatedBody,
          id: item_id,
        },
      ],
    },
  })

  res.json({
    // @ts-expect-error — Medusa's own module-layer DTO (OrderPreviewDTO/
    // OrderChangeDTO/etc.) and its HTTP-response DTO (AdminOrderPreview/
    // AdminOrderChange/etc.) are two parallel type hierarchies that don't
    // structurally unify, even though the real workflow data includes every
    // field the HTTP type expects (confirmed against Medusa's own core route,
    // which passes the same shape through with zero cast/transform).
    order_preview: result,
  })
}
