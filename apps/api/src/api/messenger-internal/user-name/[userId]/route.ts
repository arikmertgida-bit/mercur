import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import type { Query } from "@medusajs/framework"
import { z } from "zod"

import { getCatchMessage } from "../../../../lib/errors"
import {
  AdminUserRowSchema,
  PersonNameRowSchema,
  SellerSummarySchema,
  parseFirstRow,
} from "../../../../lib/graph-schemas"
import { moduleKayiLogger } from "../../../../lib/logger"

const INTERNAL_SECRET = process.env.MESSENGER_INTERNAL_SECRET ?? ""

if (!INTERNAL_SECRET) {
  moduleKayiLogger.warn(
    "[messenger-internal] MESSENGER_INTERNAL_SECRET is not set — internal endpoint will reject all requests"
  )
}

const UserIdParamsSchema = z.object({
  userId: z.string().min(1),
})

function buildPersonDisplayName(
  row: z.infer<typeof PersonNameRowSchema>,
  fallbackId: string
): string {
  const parts = [row.first_name, row.last_name].filter(
    (part): part is string => typeof part === "string" && part.length > 0
  )
  return parts.length > 0 ? parts.join(" ") : fallbackId
}

async function resolveCustomerName(
  req: MedusaRequest,
  userId: string
): Promise<string | null> {
  const customerService = req.scope.resolve<ICustomerModuleService>(
    Modules.CUSTOMER
  )
  try {
    const customer = await customerService.retrieveCustomer(userId, {
      select: ["id", "first_name", "last_name"],
    })
    const parsed = PersonNameRowSchema.safeParse(customer)
    if (!parsed.success) {
      return null
    }
    return buildPersonDisplayName(parsed.data, userId)
  } catch {
    return null
  }
}

async function resolveGraphPersonName(
  req: MedusaRequest,
  entity: "member" | "user",
  userId: string
): Promise<string | null> {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  try {
    const { data } = await query.graph({
      entity,
      filters: { id: userId },
      fields: ["id", "first_name", "last_name"],
    })
    const row = parseFirstRow(PersonNameRowSchema, data)
    if (!row) {
      return null
    }
    return buildPersonDisplayName(row, userId)
  } catch {
    return null
  }
}

async function resolveSellerName(
  req: MedusaRequest,
  userId: string
): Promise<string | null> {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  try {
    const { data } = await query.graph({
      entity: "seller",
      filters: { id: userId },
      fields: ["id", "name"],
    })
    const seller = parseFirstRow(SellerSummarySchema, data)
    return seller?.name ?? null
  } catch {
    return null
  }
}

/**
 * GET /messenger-internal/user-name/:userId
 *
 * Internal-only endpoint called by kayi-messenger to resolve display names.
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const secret = req.headers["x-internal-secret"]
  if (!secret || secret !== INTERNAL_SECRET) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const paramsResult = UserIdParamsSchema.safeParse(req.params)
  if (!paramsResult.success) {
    res.status(400).json({ message: "userId param is required" })
    return
  }

  const { userId } = paramsResult.data

  try {
    if (userId.startsWith("cus_")) {
      const displayName = await resolveCustomerName(req, userId)
      if (displayName) {
        res.json({ userId, displayName })
        return
      }
    }

    if (userId.startsWith("mem_")) {
      const displayName = await resolveGraphPersonName(req, "member", userId)
      if (displayName) {
        res.json({ userId, displayName })
        return
      }
    }

    if (userId.startsWith("user_")) {
      const displayName = await resolveGraphPersonName(req, "user", userId)
      if (displayName) {
        res.json({ userId, displayName })
        return
      }

      const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "user",
        filters: { id: userId },
        fields: ["id"],
      })
      const adminUser = parseFirstRow(AdminUserRowSchema, data)
      if (adminUser) {
        res.json({ userId, displayName: userId })
        return
      }
    }

    if (userId.startsWith("sel_")) {
      const displayName = await resolveSellerName(req, userId)
      if (displayName) {
        res.json({ userId, displayName })
        return
      }
    }

    res.json({ userId, displayName: userId })
  } catch (err) {
    const message = getCatchMessage(
      err instanceof Error ? err : typeof err === "string" ? err : null
    )
    moduleKayiLogger.error(
      `[messenger-internal] GET /user-name/${userId} error: ${message}`
    )
    res.status(500).json({ message: "Internal server error" })
  }
}
