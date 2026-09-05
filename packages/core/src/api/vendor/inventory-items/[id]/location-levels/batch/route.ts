import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { batchInventoryItemLevelsWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@mercurjs/types"
import { InventoryWorkflowEvents } from "../../../../../../workflows"

import { validateSellerInventoryItem } from "../../../helpers"
import { VendorBatchInventoryItemLocationsLevelType } from "../../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorBatchInventoryItemLocationsLevelType>,
  res: MedusaResponse<HttpTypes.VendorBatchInventoryItemLevelResponse>
) => {
  const { id } = req.params

  await validateSellerInventoryItem(req.scope,  req.seller_context!.seller_id, id)

  const body = req.validatedBody
  const hasChanges =
    (body.create?.length ?? 0) > 0 ||
    (body.update?.length ?? 0) > 0 ||
    (body.delete?.length ?? 0) > 0

  const { result } = await batchInventoryItemLevelsWorkflow(req.scope).run({
    input: {
      delete: body.delete ?? [],
      create:
        body.create?.map((c) => ({
          ...c,
          inventory_item_id: id,
        })) ?? [],
      update:
        body.update?.map((u) => ({
          ...u,
          inventory_item_id: id,
        })) ?? [],
      force: body.force ?? false,
    },
  })

  // Same gap as location-levels/batch/route.ts — `batchInventoryItemLevelsWorkflow`
  // never emits `inventory_level.changed` on its own. Every level here
  // already belongs to `id`, so no extra lookup is needed for the delete
  // branch (unlike the multi-item batch route).
  if (hasChanges) {
    await req.scope.resolve(Modules.EVENT_BUS).emit({
      name: InventoryWorkflowEvents.LEVEL_CHANGED,
      data: { inventory_item_ids: [id] },
    })
  }

  res.json({
    created: result.created,
    updated: result.updated,
    deleted: result.deleted,
  })
}
