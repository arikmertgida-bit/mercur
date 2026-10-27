import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createInventoryLevelsWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@mercurjs/types"
import { InventoryWorkflowEvents } from "../../../../../workflows"

import { validateSellerStockLocations } from "../../../stock-locations/helpers"
import { refetchInventoryItem, validateSellerInventoryItem } from "../../helpers"
import {
  VendorCreateInventoryLocationLevelType,
  VendorGetInventoryLocationLevelsParamsType,
} from "../../validators"
import { getSellerId } from "../../../../utils/seller-context"

export const GET = async (
  req: AuthenticatedMedusaRequest<
    Partial<VendorGetInventoryLocationLevelsParamsType>,
    VendorGetInventoryLocationLevelsParamsType
  >,
  res: MedusaResponse<HttpTypes.VendorInventoryLevelListResponse>
) => {
  const { id } = req.params

  await validateSellerInventoryItem(req.scope,  getSellerId(req), id)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: inventory_levels, metadata } = await query.graph({
    entity: "inventory_level",
    fields: req.queryConfig.fields,
    filters: { ...req.filterableFields, inventory_item_id: id },
    pagination: req.queryConfig.pagination,
  })

  res.json({
    inventory_levels,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorCreateInventoryLocationLevelType>,
  res: MedusaResponse<HttpTypes.VendorInventoryItemResponse>
) => {
  const { id } = req.params

  await validateSellerInventoryItem(req.scope, getSellerId(req), id)
  await validateSellerStockLocations(req.scope, getSellerId(req), [
    req.validatedBody.location_id,
  ])

  await createInventoryLevelsWorkflow(req.scope).run({
    input: {
      inventory_levels: [
        {
          ...req.validatedBody,
          inventory_item_id: id,
        },
      ],
    },
  })

  await req.scope.resolve(Modules.EVENT_BUS).emit({
    name: InventoryWorkflowEvents.LEVEL_CHANGED,
    data: { inventory_item_ids: [id] },
  })

  const inventoryItem = await refetchInventoryItem(
    id,
    req.scope,
    req.queryConfig.fields
  )

  res.json({ inventory_item: inventoryItem })
}
