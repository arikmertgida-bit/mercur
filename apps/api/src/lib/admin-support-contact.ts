import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"
import type { MedusaContainer } from "@medusajs/framework/types"

import { AdminUserRowSchema, parseFirstRow } from "./graph-schemas"

/**
 * Resolves the platform's single admin user id, used as the fixed
 * counterparty for vendor ↔ admin support conversations in kayi-messenger.
 */
export async function resolveAdminSupportUserId(
  scope: MedusaContainer
): Promise<string | null> {
  const query = scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data: users } = await query.graph({
    entity: "user",
    fields: ["id"],
  })

  const adminUser = parseFirstRow(AdminUserRowSchema, users)
  return adminUser?.id ?? null
}
