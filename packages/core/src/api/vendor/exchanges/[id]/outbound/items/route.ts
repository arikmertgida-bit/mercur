import { orderExchangeAddNewItemWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { OrderCurrencyRowSchema, resolveAddItems } from "../../../../orders/resolve-add-items"
import { VendorPostExchangesAddItemsReqType } from "../../../validators"
import { parseGraphRows } from "../../../../../../utils/graph-rows"
import { toHttpOrderPreview } from "../../../../../../utils/http-order"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPostExchangesAddItemsReqType>,
  res: MedusaResponse<{
    order_preview: HttpTypes.AdminOrderPreview
  }>
) => {
  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [exchange],
  } = await query.graph({
    entity: "order_exchange",
    fields: ["id", "order_id"],
    filters: { id },
  })

  if (!exchange?.order_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Exchange ${id} not found`
    )
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "currency_code"],
    filters: { id: exchange.order_id },
  })

  const currencyCode = parseGraphRows(OrderCurrencyRowSchema, orders)[0]
    ?.currency_code

  if (!currencyCode) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order for exchange ${id} not found`
    )
  }

  const items = await resolveAddItems({
    container: req.scope,
    currencyCode,
    items: req.validatedBody.items,
  })

  const { result } = await orderExchangeAddNewItemWorkflow(req.scope).run({
    input: { items, exchange_id: id },
  })

  res.json({
    order_preview: toHttpOrderPreview(result),
  })
}
