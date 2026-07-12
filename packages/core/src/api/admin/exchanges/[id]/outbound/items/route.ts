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

import { resolveAddItems } from "../../../../../vendor/orders/resolve-add-items"

type AdminAddItemsBody = {
  items: Array<{
    variant_id: string
    quantity: number
    unit_price?: number | null
    internal_note?: string | null
    allow_backorder?: boolean
    metadata?: Record<string, unknown> | null
  }>
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminAddItemsBody>,
  res: MedusaResponse<HttpTypes.AdminExchangePreviewResponse>
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

  const currencyCode = (
    orders?.[0] as { currency_code?: string } | undefined
  )?.currency_code

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

  const {
    data: [orderExchangeRefreshed],
  } = await query.graph({
    entity: "order_exchange",
    fields: req.queryConfig.fields,
    filters: { id, ...req.filterableFields },
  })

  res.json({
    // @ts-expect-error — Medusa's own module-layer DTO (OrderPreviewDTO/
    // OrderChangeDTO/etc.) and its HTTP-response DTO (AdminOrderPreview/
    // AdminOrderChange/etc.) are two parallel type hierarchies that don't
    // structurally unify, even though the real workflow data includes every
    // field the HTTP type expects (confirmed against Medusa's own core route,
    // which passes the same shape through with zero cast/transform).
    order_preview: result,
    exchange: orderExchangeRefreshed,
  })
}
