import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { removeCustomerAccountWorkflow } from "@medusajs/core-flows"
import type { AdminCustomerDeleteResponse } from "@medusajs/framework/types"

import { getCatchMessage } from "../../../../lib/errors"
import { resolveKayiLogger } from "../../../../lib/logger"
import { releaseCustomerAuthIdentityWorkflow } from "../../../../workflows/customer/workflows/release-customer-auth-identity"

/**
 * Overrides Medusa's core DELETE /admin/customers/:id route. Runs the exact
 * same `removeCustomerAccountWorkflow` core uses, then releases the stale
 * auth-identity link it leaves behind so the customer's email is claimable
 * again. See `releaseCustomerAuthIdentityStep` for why core alone leaves it
 * blocked. Never blocks the delete itself if the release step has an issue.
 */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminCustomerDeleteResponse>
): Promise<void> {
  const id = req.params.id
  const logger = resolveKayiLogger(req.scope)

  await removeCustomerAccountWorkflow(req.scope).run({
    input: { customerId: id },
  })

  try {
    await releaseCustomerAuthIdentityWorkflow(req.scope).run({
      input: { customerId: id },
    })
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    logger.warn(
      `[admin-delete-customer] auth-identity release failed (non-fatal) for customer ${id}: ${message}`
    )
  }

  res.status(200).json({
    id,
    object: "customer",
    deleted: true,
  })
}
