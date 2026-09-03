import type { Query } from "@medusajs/framework"
import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CommissionLineDTO, MercurModules } from "@mercurjs/types"
import type { z } from "zod"

import {
  InventoryItemSellerLinkRowSchema,
  OrderAnalyticsRowSchema,
  SellerScopedOrderLinkRowSchema,
  SellerStatusRowSchema,
  parseRows,
} from "../lib/graph-schemas"
import { getIstanbulDateString } from "../lib/reference-price"
import { computeSellerAnalyticsWorkflow } from "../workflows/compute-seller-analytics"
import { UpsertSellerDailyStatInput } from "../workflows/steps/upsert-seller-daily-stats"

/**
 * Materializes the Vendor + Admin dashboards' "kazanç"/"azalan stok"
 * widgets every 12h, so a dashboard page load never pays for a live
 * commission/inventory aggregation across a seller's full order history.
 * Order COUNTS stay live (see api/vendor/dashboard, api/admin/dashboard) —
 * only this job's output (earnings, low stock, platform rollup) is on a
 * YouTube-Analytics-style delayed refresh.
 *
 * Runs once per calendar day (Europe/Istanbul), idempotently overwriting
 * that day's row(s) on every run (the 12h schedule just means "today"'s
 * numbers get refreshed twice, not that a new day accumulates).
 */
const JOB_NAME = "compute-seller-analytics"
const CRON_SCHEDULE = "0 */12 * * *" // 00:00 and 12:00 UTC
const SELLER_BATCH_LIMIT = 100
const ID_BATCH_LIMIT = 200
const LOW_STOCK_THRESHOLD = 5
const LOW_STOCK_MAX_ITEMS_PER_SELLER = 10
// A seller's inventory is scanned up to this many items when looking for
// low-stock candidates — bounded so one very large catalog can't blow up a
// single job run's memory/time budget. This is a snapshot for a dashboard
// widget, not the authoritative inventory list (that has its own paginated
// page in both panels).
const INVENTORY_SCAN_LIMIT_PER_SELLER = 500
const DEFAULT_CURRENCY_CODE = "try"
const TERMINATED_SELLER_STATUS = "terminated"

// @mercurjs/core only publishes each module's index barrel (its Module()
// definition), not the concrete service class — so the container-resolved
// commission module is typed against the one method this job actually
// calls, rather than importing (or casting to) the full service.
interface CommissionLineReader {
  listCommissionLines(filters: {
    item_id: string[]
  }): Promise<CommissionLineDTO[]>
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

// Rounds like currency math should: 2 decimal places, no floating-point
// crumbs in a number a vendor will actually read on screen. This is a
// display aggregate, not the payout ledger — the real, precise payout
// amounts are computed separately by the existing commission/payout
// workflows and are unaffected by this job.
function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}

async function loadActiveSellerIds(query: Query): Promise<string[]> {
  const ids: string[] = []
  let skip = 0

  for (;;) {
    const { data: rows } = await query.graph({
      entity: "seller",
      fields: ["id", "status"],
      filters: { status: { $ne: TERMINATED_SELLER_STATUS } },
      pagination: { skip, take: SELLER_BATCH_LIMIT },
    })

    const sellers = parseRows(SellerStatusRowSchema, rows as object[])
    ids.push(...sellers.map((seller) => seller.id))

    if (rows.length < SELLER_BATCH_LIMIT) {
      break
    }
    skip += SELLER_BATCH_LIMIT
  }

  return ids
}

async function loadOrderIdsBySeller(
  query: Query,
  sellerIds: string[]
): Promise<Map<string, string[]>> {
  const orderIdsBySeller = new Map<string, string[]>()

  for (const sellerIdChunk of chunk(sellerIds, ID_BATCH_LIMIT)) {
    const { data: rows } = await query.graph({
      entity: "order_seller",
      fields: ["order_id", "seller_id"],
      filters: { seller_id: sellerIdChunk },
    })

    for (const link of parseRows(SellerScopedOrderLinkRowSchema, rows as object[])) {
      const list = orderIdsBySeller.get(link.seller_id) ?? []
      list.push(link.order_id)
      orderIdsBySeller.set(link.seller_id, list)
    }
  }

  return orderIdsBySeller
}

type OrderAnalyticsRow = z.infer<typeof OrderAnalyticsRowSchema>

async function loadOrdersSince(
  query: Query,
  orderIds: string[],
  sinceIso: string
): Promise<OrderAnalyticsRow[]> {
  const orders: OrderAnalyticsRow[] = []

  for (const orderIdChunk of chunk(orderIds, ID_BATCH_LIMIT)) {
    const { data: rows } = await query.graph({
      entity: "order",
      fields: ["id", "currency_code", "total", "item_total", "created_at", "items.id"],
      filters: { id: orderIdChunk, created_at: { $gte: sinceIso } },
    })

    orders.push(...parseRows(OrderAnalyticsRowSchema, rows as object[]))
  }

  return orders
}

async function loadCommissionAmountByOrderId(
  commissionService: CommissionLineReader,
  ordersByItemId: Map<string, string>
): Promise<Map<string, number>> {
  const amountByOrderId = new Map<string, number>()
  const itemIds = Array.from(ordersByItemId.keys())

  for (const itemIdChunk of chunk(itemIds, ID_BATCH_LIMIT)) {
    if (itemIdChunk.length === 0) {
      continue
    }
    const lines = await commissionService.listCommissionLines({
      item_id: itemIdChunk,
    })

    for (const line of lines) {
      if (!line.item_id) {
        continue
      }
      const orderId = ordersByItemId.get(line.item_id)
      if (!orderId) {
        continue
      }
      const amount = Number(line.amount) || 0
      amountByOrderId.set(orderId, (amountByOrderId.get(orderId) ?? 0) + amount)
    }
  }

  return amountByOrderId
}

type LowStockCandidate = {
  inventory_item_id: string
  product_title: string
  sku: string | null
  available_quantity: number
}

async function loadLowStockForSeller(
  query: Query,
  sellerId: string
): Promise<LowStockCandidate[]> {
  const { data: rows } = await query.graph({
    entity: "inventory_item_seller",
    fields: [
      "seller_id",
      "inventory_item.id",
      "inventory_item.sku",
      "inventory_item.title",
      "inventory_item.location_levels.stocked_quantity",
      "inventory_item.location_levels.reserved_quantity",
    ],
    filters: { seller_id: sellerId },
    pagination: { skip: 0, take: INVENTORY_SCAN_LIMIT_PER_SELLER },
  })

  const candidates: LowStockCandidate[] = []
  for (const link of parseRows(InventoryItemSellerLinkRowSchema, rows as object[])) {
    const item = link.inventory_item
    if (!item) {
      continue
    }
    const available = (item.location_levels ?? []).reduce(
      (sum, level) => sum + (level.stocked_quantity - level.reserved_quantity),
      0
    )
    if (available > LOW_STOCK_THRESHOLD) {
      continue
    }
    candidates.push({
      inventory_item_id: item.id,
      product_title: item.title ?? item.sku ?? item.id,
      sku: item.sku ?? null,
      available_quantity: available,
    })
  }

  return candidates
    .sort((a, b) => a.available_quantity - b.available_quantity)
    .slice(0, LOW_STOCK_MAX_ITEMS_PER_SELLER)
}

async function loadPlatformTotals(query: Query): Promise<{
  totalProducts: number
  totalSellers: number
  totalCustomers: number
}> {
  const [{ metadata: productMeta }, { metadata: sellerMeta }, { metadata: customerMeta }] =
    await Promise.all([
      query.graph({
        entity: "product",
        fields: ["id"],
        filters: { status: "published" },
        pagination: { skip: 0, take: 1 },
      }),
      query.graph({
        entity: "seller",
        fields: ["id"],
        filters: { status: { $ne: TERMINATED_SELLER_STATUS } },
        pagination: { skip: 0, take: 1 },
      }),
      query.graph({
        entity: "customer",
        fields: ["id"],
        pagination: { skip: 0, take: 1 },
      }),
    ])

  return {
    totalProducts: productMeta?.count ?? 0,
    totalSellers: sellerMeta?.count ?? 0,
    totalCustomers: customerMeta?.count ?? 0,
  }
}

export default async function computeSellerAnalyticsJob(
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const commissionService = container.resolve<CommissionLineReader>(
    MercurModules.COMMISSION
  )

  try {
    const now = new Date()
    const today = getIstanbulDateString(now)
    // Istanbul midnight, expressed as a UTC instant, for the order
    // created_at >= filter (Istanbul is UTC+3, no DST).
    const startOfTodayIso = `${today}T00:00:00+03:00`

    const sellerIds = await loadActiveSellerIds(query)
    if (sellerIds.length === 0) {
      logger.info(`[${JOB_NAME}] no active sellers found`)
      return
    }

    let platformOrdersCount = 0
    let platformGrossRevenue = 0
    let platformCommissionEarnings = 0
    let platformCurrencyCode = DEFAULT_CURRENCY_CODE

    for (const sellerIdBatch of chunk(sellerIds, SELLER_BATCH_LIMIT)) {
      const orderIdsBySeller = await loadOrderIdsBySeller(query, sellerIdBatch)
      const allOrderIds = Array.from(orderIdsBySeller.values()).flat()

      const orders =
        allOrderIds.length > 0
          ? await loadOrdersSince(query, allOrderIds, startOfTodayIso)
          : []

      const orderById = new Map(orders.map((order) => [order.id, order]))
      const itemIdToOrderId = new Map<string, string>()
      for (const order of orders) {
        for (const item of order.items ?? []) {
          itemIdToOrderId.set(item.id, order.id)
        }
      }

      const commissionByOrderId = await loadCommissionAmountByOrderId(
        commissionService,
        itemIdToOrderId
      )

      const sellerDailyStats: UpsertSellerDailyStatInput[] = []
      const lowStockItems: {
        seller_id: string
        inventory_item_id: string
        product_title: string
        sku: string | null
        available_quantity: number
        computed_at: Date
      }[] = []

      for (const sellerId of sellerIdBatch) {
        const sellerOrderIds = orderIdsBySeller.get(sellerId) ?? []
        const sellerOrders = sellerOrderIds
          .map((id) => orderById.get(id))
          .filter((order): order is OrderAnalyticsRow => Boolean(order))

        const currencyCode = sellerOrders[0]?.currency_code ?? DEFAULT_CURRENCY_CODE
        const grossRevenue = sellerOrders.reduce((sum, order) => sum + order.total, 0)
        const commissionTotal = sellerOrders.reduce(
          (sum, order) => sum + (commissionByOrderId.get(order.id) ?? 0),
          0
        )

        sellerDailyStats.push({
          seller_id: sellerId,
          date: today,
          currency_code: currencyCode,
          orders_count: sellerOrders.length,
          gross_revenue: roundCurrency(grossRevenue),
          net_earnings: roundCurrency(grossRevenue - commissionTotal),
          computed_at: now,
        })

        platformOrdersCount += sellerOrders.length
        platformGrossRevenue += grossRevenue
        platformCommissionEarnings += commissionTotal
        if (sellerOrders.length > 0) {
          platformCurrencyCode = currencyCode
        }

        const lowStock = await loadLowStockForSeller(query, sellerId)
        for (const candidate of lowStock) {
          lowStockItems.push({
            seller_id: sellerId,
            inventory_item_id: candidate.inventory_item_id,
            product_title: candidate.product_title,
            sku: candidate.sku,
            available_quantity: candidate.available_quantity,
            computed_at: now,
          })
        }
      }

      await computeSellerAnalyticsWorkflow(container).run({
        input: {
          sellerDailyStats,
          lowStock: { sellerIds: sellerIdBatch, items: lowStockItems },
        },
      })
    }

    const platformTotals = await loadPlatformTotals(query)

    await computeSellerAnalyticsWorkflow(container).run({
      input: {
        sellerDailyStats: [],
        lowStock: { sellerIds: [], items: [] },
        platformDailyStat: {
          date: today,
          currency_code: platformCurrencyCode,
          orders_count: platformOrdersCount,
          gross_revenue: roundCurrency(platformGrossRevenue),
          commission_earnings: roundCurrency(platformCommissionEarnings),
          total_products: platformTotals.totalProducts,
          total_sellers: platformTotals.totalSellers,
          total_customers: platformTotals.totalCustomers,
          computed_at: now,
        },
      },
    })

    logger.info(
      `[${JOB_NAME}] materialized analytics for ${sellerIds.length} sellers, ${platformOrdersCount} orders today (${today})`
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
