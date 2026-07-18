import { z } from "zod"
import { MedusaNextFunction, AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MercurModules } from "@mercurjs/types"
import type { CustomFieldsModuleService } from "@mercurjs/core/modules/custom-fields"
import { RequestStatusFilterSchema, parseRequestEntityType } from "../../../types/requests"

const SubmitterIdFilterSchema = z.union([z.string(), z.array(z.string())])

/**
 * `query.graph()` filters by the entity's own columns — `request_status` /
 * `submitter_id` live on the `custom_fields` link table instead, so passing
 * them straight through as top-level filters is silently a no-op: the graph
 * query matches every row of the entity (e.g. all product categories, not
 * just the ones ever submitted as a request), which also makes
 * `metadata.count` report that inflated total while the response body is
 * still correctly narrowed down by `parseRequestEntitySafe`/`isRequestEntity`.
 * Resolving the matching ids against the custom_fields table first — same
 * approach as `vendor/requests/product-categories/helpers.ts` — keeps the
 * `count` and the returned list in sync.
 */
export function applyAdminRequestCustomFieldsFilter() {
  return async function (
    req: AuthenticatedMedusaRequest,
    _res: MedusaResponse,
    next: MedusaNextFunction
  ) {
    if (!req.params.type) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Request type is required")
    }
    const alias = parseRequestEntityType(req.params.type)
    const customFieldsService = req.scope.resolve<CustomFieldsModuleService>(MercurModules.CUSTOM_FIELDS)

    const filters: Record<string, string | string[]> = {}

    const requestStatus = RequestStatusFilterSchema.safeParse(
      req.filterableFields.request_status
    )
    if (requestStatus.success) {
      filters.request_status = requestStatus.data
      delete req.filterableFields.request_status
    }

    const submitterId = SubmitterIdFilterSchema.safeParse(
      req.filterableFields.submitter_id
    )
    if (submitterId.success) {
      filters.submitter_id = submitterId.data
      delete req.filterableFields.submitter_id
    }

    const customFieldRows = await customFieldsService.list(alias, filters, {})
    const entityIds = customFieldRows.map((row) => row[`${alias}_id`])

    req.filterableFields.id = entityIds

    return next()
  }
}
