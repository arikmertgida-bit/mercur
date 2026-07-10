import { MedusaNextFunction, AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MercurModules } from "@mercurjs/types"
import type { CustomFieldsModuleService } from "@mercurjs/core/modules/custom-fields"
import { RequestStatusFilterSchema } from "../../../../types/requests"

export function applyRequestCustomFieldsFilter() {
  return async function (
    req: AuthenticatedMedusaRequest,
    _res: MedusaResponse,
    next: MedusaNextFunction
  ) {
    const customFieldsService = req.scope.resolve<CustomFieldsModuleService>(MercurModules.CUSTOM_FIELDS)

    const filters: Record<string, string | string[]> = {
      submitter_id: req.auth_context.actor_id,
    }

    const requestStatus = RequestStatusFilterSchema.safeParse(
      req.filterableFields.request_status
    )
    if (requestStatus.success) {
      filters.request_status = requestStatus.data
      delete req.filterableFields.request_status
    }

    const customFieldRows = await customFieldsService.list("product_collection", filters, {})

    const entityIds = customFieldRows.map((row) => row["product_collection_id"])

    req.filterableFields.id = entityIds

    return next()
  }
}
