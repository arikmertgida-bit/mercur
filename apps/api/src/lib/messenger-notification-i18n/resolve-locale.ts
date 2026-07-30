import type { MedusaContainer } from "@medusajs/framework/types"
import type { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"

import { JsonRecordSchema, parseFirstRow, type JsonRecord } from "../graph-schemas"
import {
  DEFAULT_NOTIFICATION_LANGUAGE,
  isNotificationLanguage,
  type NotificationLanguage,
} from "./languages"

const MetadataRowSchema = z.object({
  id: z.string(),
  metadata: JsonRecordSchema.nullable().optional(),
})

/**
 * No dedicated `locale` column exists on seller/customer — it lives in the
 * existing generic `metadata` JSON field (already writable through the
 * standard seller/customer update endpoints), avoiding a schema migration
 * on a shared/native Medusa module for a single soft preference field.
 */
function extractLocale(metadata: JsonRecord | null | undefined): string | undefined {
  const value = metadata?.locale
  return typeof value === "string" ? value : undefined
}

function resolveLanguage(locale: string | undefined): NotificationLanguage {
  return locale && isNotificationLanguage(locale) ? locale : DEFAULT_NOTIFICATION_LANGUAGE
}

export async function resolveSellerNotificationLanguage(
  container: MedusaContainer,
  sellerId: string
): Promise<NotificationLanguage> {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "seller",
    fields: ["id", "metadata"],
    filters: { id: sellerId },
  })
  const row = parseFirstRow(MetadataRowSchema, data)
  return resolveLanguage(extractLocale(row?.metadata))
}

export async function resolveCustomerNotificationLanguage(
  container: MedusaContainer,
  customerId: string
): Promise<NotificationLanguage> {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "metadata"],
    filters: { id: customerId },
  })
  const row = parseFirstRow(MetadataRowSchema, data)
  return resolveLanguage(extractLocale(row?.metadata))
}
