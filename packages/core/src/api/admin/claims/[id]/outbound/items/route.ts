import { orderClaimAddNewItemWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import {
  OrderCurrencyRowSchema,
  resolveAddItems,
} from "../../../../../vendor/orders/resolve-add-items"
import { parseGraphRows } from "../../../../../../utils/graph-rows"
import { toHttpOrderPreview } from "../../../../../../utils/http-order"

type AdminAddItemsBody = {
  items: Array<{
    variant_id: string
    quantity: number
    unit_price?: number | null
    internal_note?: string | null
    metadata?: HttpTypes.AdminAddClaimOutboundItems["items"][number]["metadata"] | null
  }>
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminAddItemsBody>,
  res: MedusaResponse<HttpTypes.AdminClaimPreviewResponse>
) => {
  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [claim],
  } = await query.graph({
    entity: "order_claim",
    fields: ["id", "order_id"],
    filters: { id },
  })

  if (!claim?.order_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Claim ${id} not found`
    )
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "currency_code"],
    filters: { id: claim.order_id },
  })

  const currencyCode = parseGraphRows(OrderCurrencyRowSchema, orders)[0]
    ?.currency_code

  if (!currencyCode) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order for claim ${id} not found`
    )
  }

  const items = await resolveAddItems({
    container: req.scope,
    currencyCode,
    items: req.validatedBody.items,
  })

  const { result } = await orderClaimAddNewItemWorkflow(req.scope).run({
    input: { items, claim_id: id },
  })

  const {
    data: [orderClaim],
  } = await query.graph({
    entity: "order_claim",
    fields: req.queryConfig.fields,
    filters: { id, ...req.filterableFields },
  })

  res.json({
    order_preview: toHttpOrderPreview(result),
    claim: orderClaim,
  })
}
