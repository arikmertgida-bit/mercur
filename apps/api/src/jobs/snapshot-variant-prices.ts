import type { Query } from "@medusajs/framework"
import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, QueryContext } from "@medusajs/framework/utils"
import { isSellerVisible, SellerClosureFields } from "@mercurjs/core/api/utils/sellers"
import { z } from "zod"

import { parseRows } from "../lib/graph-schemas"
import { getIstanbulDateString } from "../lib/reference-price"
import { resolveRegionByCountryCode } from "../lib/resolve-region"
import { VARIANT_PRICE_HISTORY_MODULE } from "../modules/variant-price-history"
import VariantPriceHistoryService from "../modules/variant-price-history/service"
import { CreateVariantPriceSnapshotInput } from "../workflows/steps/create-variant-price-snapshots"
import { snapshotVariantPricesWorkflow } from "../workflows/snapshot-variant-prices"

// Ticaret Bakanlığı'nın "indirime esas alınacak fiyat, indirimden önceki son
// 10 gün içinde uygulanan en düşük fiyat olacak" kuralı için taban veri
// toplama işi. Fiyat en az 3 farklı yerden değişebildiğinden (varyant
// fiyatı, Fiyat Listesi, satıcı promosyonları) her yazma noktasını
// hook'lamak yerine, o günün gerçekte sunulan (aktif kampanya/indirim
// sonrası) fiyatını her varyant için tek satır olarak günlük kaydeder —
// hangi ekrandan değiştiğine bakılmaksızın hepsini otomatik yakalar.
const JOB_NAME = "snapshot-variant-prices"
const CRON_SCHEDULE = "0 21 * * *" // 21:00 UTC = 00:00 Europe/Istanbul
const BATCH_LIMIT = 200
const STORE_COUNTRY_CODE = "tr"

const SnapshotEligibilityRowSchema = z.object({
  id: z.string(),
  variants: z
    .array(z.object({ id: z.string() }))
    .nullable()
    .default([]),
  sellers: z
    .array(
      z.object({
        id: z.string(),
        status: z.string(),
        closed_from: z.union([z.string(), z.date()]).nullable().optional(),
        closed_to: z.union([z.string(), z.date()]).nullable().optional(),
      })
    )
    .nullable()
    .default([]),
})

const VariantCalculatedPriceRowSchema = z.object({
  id: z.string(),
  calculated_price: z
    .object({
      calculated_amount: z.number().nullable().optional(),
      calculated_amount_with_tax: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
})

const ExistingSnapshotRowSchema = z.object({
  variant_id: z.string(),
})

type EligibleVariant = {
  variantId: string
  sellerId: string
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

async function loadEligibleVariants(
  query: Query,
  now: Date
): Promise<EligibleVariant[]> {
  const eligible: EligibleVariant[] = []
  let skip = 0

  for (;;) {
    const { data: rows } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "variants.id",
        "sellers.id",
        "sellers.status",
        "sellers.closed_from",
        "sellers.closed_to",
      ],
      filters: { status: "published" },
      pagination: { skip, take: BATCH_LIMIT },
    })

    const products = parseRows(SnapshotEligibilityRowSchema, rows as object[])

    for (const product of products) {
      const seller = (product.sellers ?? [])[0]
      if (!seller) {
        continue
      }
      const sellerClosure: SellerClosureFields = {
        status: seller.status,
        closed_from: seller.closed_from ?? null,
        closed_to: seller.closed_to ?? null,
      }
      if (!isSellerVisible(sellerClosure, now)) {
        continue
      }
      for (const variant of product.variants ?? []) {
        eligible.push({ variantId: variant.id, sellerId: seller.id })
      }
    }

    if (rows.length < BATCH_LIMIT) {
      break
    }
    skip += BATCH_LIMIT
  }

  return eligible
}

async function loadCalculatedPrices(
  query: Query,
  variantIds: string[],
  regionId: string,
  currencyCode: string
): Promise<Map<string, number>> {
  const prices = new Map<string, number>()

  for (const variantIdChunk of chunk(variantIds, BATCH_LIMIT)) {
    const { data: rows } = await query.graph({
      entity: "product_variant",
      fields: ["id", "calculated_price.*"],
      filters: { id: variantIdChunk },
      context: {
        calculated_price: QueryContext({
          currency_code: currencyCode,
          region_id: regionId,
        }),
      },
    })

    for (const row of parseRows(VariantCalculatedPriceRowSchema, rows as object[])) {
      const amount =
        row.calculated_price?.calculated_amount_with_tax ??
        row.calculated_price?.calculated_amount

      if (typeof amount === "number") {
        prices.set(row.id, amount)
      }
    }
  }

  return prices
}

async function loadAlreadySnapshottedVariantIds(
  service: VariantPriceHistoryService,
  variantIds: string[],
  currencyCode: string,
  capturedDate: string
): Promise<Set<string>> {
  const already = new Set<string>()

  for (const variantIdChunk of chunk(variantIds, BATCH_LIMIT)) {
    const rows = await service.listVariantPriceSnapshots({
      variant_id: variantIdChunk,
      currency_code: currencyCode,
      captured_date: capturedDate,
    })
    for (const row of parseRows(ExistingSnapshotRowSchema, rows as object[])) {
      already.add(row.variant_id)
    }
  }

  return already
}

export default async function snapshotVariantPricesJob(
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const variantPriceHistoryService = container.resolve<VariantPriceHistoryService>(
    VARIANT_PRICE_HISTORY_MODULE
  )

  try {
    const region = await resolveRegionByCountryCode(query, STORE_COUNTRY_CODE)
    if (!region) {
      logger.error(
        `[${JOB_NAME}] no region found for country code "${STORE_COUNTRY_CODE}" — skipping run`
      )
      return
    }

    const now = new Date()
    const capturedDate = getIstanbulDateString(now)

    const eligibleVariants = await loadEligibleVariants(query, now)
    if (eligibleVariants.length === 0) {
      logger.info(`[${JOB_NAME}] no eligible variants found`)
      return
    }

    const eligibleVariantIds = eligibleVariants.map((variant) => variant.variantId)
    const alreadySnapshotted = await loadAlreadySnapshottedVariantIds(
      variantPriceHistoryService,
      eligibleVariantIds,
      region.currency_code,
      capturedDate
    )

    const pending = eligibleVariants.filter(
      (variant) => !alreadySnapshotted.has(variant.variantId)
    )
    if (pending.length === 0) {
      logger.info(`[${JOB_NAME}] all ${eligibleVariants.length} variants already snapshotted for ${capturedDate}`)
      return
    }

    const calculatedPrices = await loadCalculatedPrices(
      query,
      pending.map((variant) => variant.variantId),
      region.id,
      region.currency_code
    )

    const snapshots: CreateVariantPriceSnapshotInput[] = pending.flatMap((variant) => {
      const amount = calculatedPrices.get(variant.variantId)
      if (amount === undefined) {
        return []
      }
      return [
        {
          variant_id: variant.variantId,
          seller_id: variant.sellerId,
          currency_code: region.currency_code,
          amount,
          captured_date: capturedDate,
        },
      ]
    })

    if (snapshots.length === 0) {
      logger.info(`[${JOB_NAME}] no priced variants to snapshot for ${capturedDate}`)
      return
    }

    for (const snapshotChunk of chunk(snapshots, BATCH_LIMIT)) {
      await snapshotVariantPricesWorkflow(container).run({
        input: { snapshots: snapshotChunk },
      })
    }

    logger.info(
      `[${JOB_NAME}] recorded ${snapshots.length} price snapshots for ${capturedDate} (${eligibleVariants.length - pending.length} already existed)`
    )
  } catch (error) {
    logger.error(
      `[${JOB_NAME}] failed:`,
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

export const config = {
  name: JOB_NAME,
  schedule: CRON_SCHEDULE,
}
