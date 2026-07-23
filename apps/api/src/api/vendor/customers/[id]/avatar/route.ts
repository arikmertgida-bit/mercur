import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"
import { z } from "zod"

import { extractAvatarUrl, JsonRecordSchema } from "../../../../../lib/graph-schemas"

const CustomerAvatarRowSchema = z.object({
  id: z.string(),
  metadata: JsonRecordSchema.nullable().optional(),
})

export type VendorCustomerAvatarResponse = {
  avatar_url: string | null
}

/**
 * GET /vendor/customers/:id/avatar
 *
 * Deliberately bypasses validateSellerCustomer (the seller_customer link is
 * only created once a customer completes an order with this seller) — a
 * customer messaging a seller with a pre-purchase product/store question has
 * no such link yet, so the full /vendor/customers/:id endpoint 404s for
 * exactly the messenger's main use case. The avatar itself carries no PII
 * beyond what /store/product-reviews already exposes to anonymous storefront
 * visitors, so scoping this to "any authenticated seller member" (already
 * enforced by the global /vendor/* auth middleware) is not a privacy
 * regression.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<VendorCustomerAvatarResponse>
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const { data: customers } = await query.graph({
    entity: "customer",
    filters: { id: req.params.id },
    fields: ["id", "metadata"],
  })

  const parsed = CustomerAvatarRowSchema.safeParse(customers[0])
  const avatarUrl = parsed.success ? extractAvatarUrl(parsed.data.metadata) : undefined

  res.json({ avatar_url: avatarUrl ?? null })
}
