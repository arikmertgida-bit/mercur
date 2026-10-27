import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"

import { JsonValueSchema } from "../../../../../utils/json-schema"

// A provider option is provider-defined data around the `id` every option
// carries; `is_return` is only set by providers that offer return options.
const FulfillmentOptionSchema = z
  .object({
    id: z.string(),
    is_return: z
      .boolean()
      .optional()
      .transform((isReturn) => isReturn ?? false),
  })
  .catchall(JsonValueSchema)

/**
 * The options a fulfillment provider offers for shipping options (the
 * vendor counterpart of Medusa's `GET /admin/fulfillment-providers/:id/options`).
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.AdminFulfillmentProviderOptionsListResponse>
) => {
  const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT)

  const options = await fulfillmentModule.retrieveFulfillmentOptions(
    req.params.id
  )
  const fulfillment_options = z.array(FulfillmentOptionSchema).parse(options)

  res.json({
    fulfillment_options,
    count: fulfillment_options.length,
    limit: fulfillment_options.length,
    offset: 0,
  })
}
