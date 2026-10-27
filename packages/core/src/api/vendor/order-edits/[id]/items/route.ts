import { orderEditAddNewItemWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { OrderCurrencyRowSchema, resolveAddItems } from "../../../orders/resolve-add-items"
import { VendorPostOrderEditsAddItemsReqType } from "../../validators"
import { parseGraphRows } from "../../../../../utils/graph-rows"
import { toHttpOrderPreview } from "../../../../../utils/http-order"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostOrderEditsAddItemsReqType>,
  res: MedusaResponse<HttpTypes.AdminOrderEditPreviewResponse>
) => {
  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "orders",
    fields: ["id", "currency_code"],
    filters: { id },
  })

  const order = parseGraphRows(OrderCurrencyRowSchema, orders)[0]
  if (!order?.currency_code) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order ${id} not found`
    )
  }

  const items = await resolveAddItems({
    container: req.scope,
    currencyCode: order.currency_code,
    items: req.validatedBody.items,
  })

  const { result } = await orderEditAddNewItemWorkflow(req.scope).run({
    input: { items, order_id: id },
  })

  res.json({
    order_preview: toHttpOrderPreview(result),
  })
}
