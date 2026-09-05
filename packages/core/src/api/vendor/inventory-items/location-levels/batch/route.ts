import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"
import { batchInventoryItemLevelsWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@mercurjs/types"
import { InventoryWorkflowEvents } from "../../../../../workflows"

import { VendorBatchInventoryItemLevelsType } from "../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorBatchInventoryItemLevelsType>,
  res: MedusaResponse<HttpTypes.VendorBatchInventoryItemLevelResponse>
) => {
  const body = req.validatedBody
  const deleteIds = body.delete ?? []

  // `delete` only carries inventory LEVEL ids (see VendorBatchInventoryItemLevels)
  // — once the workflow below runs, the level row (and with it its
  // inventory_item_id) is gone, so the affected item ids for the delete
  // branch must be resolved before the workflow executes.
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data: levelsPendingDelete } = deleteIds.length
    ? await query.graph({
        entity: "inventory_level",
        fields: ["id", "inventory_item_id"],
        filters: { id: deleteIds },
      })
    : { data: [] }

  const { result } = await batchInventoryItemLevelsWorkflow(req.scope).run({
    input: {
      create: body.create ?? [],
      update: body.update ?? [],
      delete: deleteIds,
      force: body.force ?? false,
    },
  })

  // Unlike the single-item location-level routes, `batchInventoryItemLevelsWorkflow`
  // (a plain @medusajs/core-flows workflow, not Mercur/Kayı code) never emits
  // `inventory_level.changed` itself — without this, every stock edit made
  // through this batch endpoint silently skipped the Vendor/Admin "Azalan
  // Stok" widget (subscribers/inventory-level-changed-low-stock.ts) and the
  // Meilisearch stock sync (subscribers/inventory-level-changed.ts).
  const changedInventoryItemIds = Array.from(
    new Set([
      ...result.created.map((level) => level.inventory_item_id),
      ...result.updated.map((level) => level.inventory_item_id),
      ...levelsPendingDelete.map((level) => level.inventory_item_id),
    ])
  )

  if (changedInventoryItemIds.length > 0) {
    await req.scope.resolve(Modules.EVENT_BUS).emit({
      name: InventoryWorkflowEvents.LEVEL_CHANGED,
      data: { inventory_item_ids: changedInventoryItemIds },
    })
  }

  res.json({
    created: result.created,
    updated: result.updated,
    deleted: result.deleted,
  })
}
