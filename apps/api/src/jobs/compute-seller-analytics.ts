import type { Query } from "@medusajs/framework"
import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CommissionLineDTO, MercurModules } from "@mercurjs/types"

import {
  InventoryItemSellerLinkRowSchema,
  OrderAnalyticsRow,
  OrderAnalyticsRowSchema,
  SellerScopedOrderLinkRowSchema,
  SellerStatusRowSchema,
  parseRows,
} from "../lib/graph-schemas"
import {
  LOW_STOCK_THRESHOLD,
  PUBLISHED_PRODUCT_STATUS,
  computeAvailableQuantity,
  hasPublishedListing,
  resolveThumbnail,
} from "../lib/low-stock"
import { getIstanbulDateString } from "../lib/reference-price"
import { SELLER_ANALYTICS_MODULE } from "../modules/seller-analytics"
import type SellerAnalyticsModuleService from "../modules/seller-analytics/service"
import { computeSellerAnalyticsWorkflow } from "../workflows/compute-seller-analytics"
import { UpsertSellerDailyStatInput } from "../workflows/steps/upsert-seller-daily-stats"

/**
 * Materializes the Vendor + Admin dashboards' "kazanç" (earnings) and
 * platform-rollup widgets every 12h, so a dashboard page load never pays for
 * a live commission aggregation across a seller's full order history. Order
 * COUNTS stay live (see api/vendor/dashboard, api/admin/dashboard) on a
 * YouTube-Analytics-style delayed refresh.
 *
 * "Azalan Stok" (low stock) is seeded by this job's initial per-seller scan
 * but then kept live in between runs by
 * subscribers/inventory-level-changed-low-stock.ts, which reacts to every
 * `inventory_level.changed` event — a seller restocking to at/above
 * LOW_STOCK_THRESHOLD (see lib/low-stock.ts) drops off the widget the
 * instant they save, not up to 12h later.
 *
 * Runs once per calendar day (Europe/Istanbul), idempotently overwriting
 * that day's row(s) on every run (the 12h schedule just means "today"'s
 * numbers get refreshed twice, not that a new day accumulates).
 *
 * Self-healing backfill: a cron trigger only fires if the process happens to
 * be up at that exact instant, so a deploy, restart, or brief outage
 * straddling 00:00/12:00 UTC silently skips a run. Without a catch-up path,
 * whichever Istanbul calendar day that run would have covered gets no
 * seller_daily_stat/platform_daily_stat row at all — a permanent gap in the
 * trend chart, and (before the "today" freshness guard added to
 * api/vendor/dashboard and api/admin/dashboard) a stale prior day silently
 * mislabeled as "today" on the next successful run. Every run therefore
 * recomputes not just today but every Istanbul day since the last row this
 * job ever wrote (capped at MAX_BACKFILL_DAYS so a long-dead job doesn't
 * try to reconstruct months of history in one pass — this table is a
 * dashboard display cache, not the payout ledger, so an old gap beyond the
 * cap stays a gap rather than blocking the run).
 */
const JOB_NAME = "compute-seller-analytics"
const CRON_SCHEDULE = "0 */12 * * *" // 00:00 and 12:00 UTC
const SELLER_BATCH_LIMIT = 100
const ID_BATCH_LIMIT = 200
export const MAX_BACKFILL_DAYS = 30
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

// Plain calendar-date string arithmetic ("YYYY-MM-DD" + N days), independent
// of any wall-clock/DST concern — Istanbul has none anyway (see
// getIstanbulDateString) — so noon UTC is just a safe anchor that can never
// roll onto the wrong day from a timezone offset.
export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

async function loadLastComputedPlatformDate(
  analyticsService: SellerAnalyticsModuleService
): Promise<string | null> {
  const [latest] = await analyticsService.listPlatformDailyStats(
    {},
    { order: { date: "DESC" }, take: 1 }
  )
  return latest?.date ?? null
}

// Every Istanbul calendar day this job needs to (re)compute this run: today,
// plus any day after the last one it ever successfully wrote that has no
// row yet. A healthy, never-missed schedule always resolves to just
// `[today]` — identical cost to before this backfill existed. A gap only
// costs more the run that actually heals it, and even then only up to
// MAX_BACKFILL_DAYS: if the job has been down longer than that, the oldest
// missing days are left as a permanent gap rather than the run trying to
// reconstruct unbounded history (or worse, never catching back up to
// "today" because it's still working through months of backlog).
export function resolveDatesToProcess(lastComputedDate: string | null, today: string): string[] {
  const startDate =
    lastComputedDate && lastComputedDate < today
      ? addDaysToDateString(lastComputedDate, 1)
      : today

  const dates: string[] = []
  let cursor = startDate
  while (cursor <= today) {
    dates.push(cursor)
    cursor = addDaysToDateString(cursor, 1)
  }
  if (dates.length === 0) {
    dates.push(today)
  }

  return dates.length > MAX_BACKFILL_DAYS
    ? dates.slice(dates.length - MAX_BACKFILL_DAYS)
    : dates
}

// Keyed by seller id -> the seller's own onboarding-chosen operating
// currency (Seller.currency_code, always set — see packages/core's seller
// model). This is the authoritative currency for a seller's earnings
// display, independent of which currency any single order happened to use.
async function loadActiveSellerCurrencies(query: Query): Promise<Map<string, string>> {
  const currencyBySeller = new Map<string, string>()
  let skip = 0

  for (;;) {
    const { data: rows } = await query.graph({
      entity: "seller",
      fields: ["id", "status", "currency_code"],
      filters: { status: { $ne: TERMINATED_SELLER_STATUS } },
      pagination: { skip, take: SELLER_BATCH_LIMIT },
    })

    const sellers = parseRows(SellerStatusRowSchema, rows)
    for (const seller of sellers) {
      currencyBySeller.set(seller.id, seller.currency_code)
    }

    if (rows.length < SELLER_BATCH_LIMIT) {
      break
    }
    skip += SELLER_BATCH_LIMIT
  }

  return currencyBySeller
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

    for (const link of parseRows(SellerScopedOrderLinkRowSchema, rows)) {
      const list = orderIdsBySeller.get(link.seller_id) ?? []
      list.push(link.order_id)
      orderIdsBySeller.set(link.seller_id, list)
    }
  }

  return orderIdsBySeller
}

async function loadOrdersSince(
  query: Query,
  orderIds: string[],
  sinceIso: string
): Promise<OrderAnalyticsRow[]> {
  const orders: OrderAnalyticsRow[] = []

  for (const orderIdChunk of chunk(orderIds, ID_BATCH_LIMIT)) {
    const { data: rows } = await query.graph({
      entity: "order",
      fields: ["id", "currency_code", "summary.accounting_total", "created_at", "items.id"],
      filters: { id: orderIdChunk, created_at: { $gte: sinceIso } },
    })

    orders.push(...parseRows(OrderAnalyticsRowSchema, rows))
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
  thumbnail: string | null
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
      "inventory_item.variants.product.status",
      "inventory_item.variants.product.thumbnail",
    ],
    filters: { seller_id: sellerId },
    pagination: { skip: 0, take: INVENTORY_SCAN_LIMIT_PER_SELLER },
  })

  const candidates: LowStockCandidate[] = []
  for (const link of parseRows(InventoryItemSellerLinkRowSchema, rows)) {
    const item = link.inventory_item
    if (!item || !hasPublishedListing(item.variants)) {
      continue
    }
    const available = computeAvailableQuantity(item.location_levels)
    if (available >= LOW_STOCK_THRESHOLD) {
      continue
    }
    candidates.push({
      inventory_item_id: item.id,
      product_title: item.title ?? item.sku ?? item.id,
      sku: item.sku ?? null,
      thumbnail: resolveThumbnail(item.variants),
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
        filters: { status: PUBLISHED_PRODUCT_STATUS },
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

type PlatformDateTotals = {
  ordersCount: number
  grossRevenue: number
  commissionEarnings: number
  currencyCode: string
}

// platformTotalsByDate is always seeded with exactly datesToProcess's keys
// before this job ever reads from it, so a miss here means the two fell out
// of sync — a programming error worth failing loudly on, not a `!` away.
function getPlatformTotals(
  totalsByDate: Map<string, PlatformDateTotals>,
  date: string
): PlatformDateTotals {
  const totals = totalsByDate.get(date)
  if (!totals) {
    throw new Error(
      `[${JOB_NAME}] platform totals missing for date ${date} — datesToProcess/platformTotalsByDate got out of sync`
    )
  }
  return totals
}

export default async function computeSellerAnalyticsJob(
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const commissionService = container.resolve<CommissionLineReader>(
    MercurModules.COMMISSION
  )
  const analyticsService = container.resolve<SellerAnalyticsModuleService>(
    SELLER_ANALYTICS_MODULE
  )

  try {
    const now = new Date()
    const today = getIstanbulDateString(now)

    const lastComputedDate = await loadLastComputedPlatformDate(analyticsService)
    const datesToProcess = resolveDatesToProcess(lastComputedDate, today)
    if (datesToProcess.length > 1) {
      logger.info(
        `[${JOB_NAME}] backfilling ${datesToProcess.length - 1} missed day(s) ` +
          `before today (last row on hand: ${lastComputedDate ?? "none"})`
      )
    }
    // Istanbul midnight of the earliest day in scope, expressed as a UTC
    // instant, for the order created_at >= filter (Istanbul is UTC+3, no
    // DST). On the common, never-missed-a-run path this is just today's
    // midnight — identical query to before the backfill logic existed.
    const earliestStartIso = `${datesToProcess[0]}T00:00:00+03:00`

    const currencyBySeller = await loadActiveSellerCurrencies(query)
    const sellerIds = Array.from(currencyBySeller.keys())
    if (sellerIds.length === 0) {
      logger.info(`[${JOB_NAME}] no active sellers found`)
      return
    }

    const platformTotalsByDate = new Map<string, PlatformDateTotals>(
      datesToProcess.map((date) => [
        date,
        { ordersCount: 0, grossRevenue: 0, commissionEarnings: 0, currencyCode: DEFAULT_CURRENCY_CODE },
      ])
    )

    for (const sellerIdBatch of chunk(sellerIds, SELLER_BATCH_LIMIT)) {
      const orderIdsBySeller = await loadOrderIdsBySeller(query, sellerIdBatch)
      const allOrderIds = Array.from(orderIdsBySeller.values()).flat()

      const orders =
        allOrderIds.length > 0
          ? await loadOrdersSince(query, allOrderIds, earliestStartIso)
          : []

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

      // Bucket this batch's orders by Istanbul calendar date once, so
      // computing each date in datesToProcess below only re-reduces the
      // handful of orders that actually landed on it instead of re-querying
      // the database once per missed day.
      const orderIdsByDate = new Map<string, Set<string>>()
      for (const order of orders) {
        const orderDate = getIstanbulDateString(new Date(order.created_at))
        const bucket = orderIdsByDate.get(orderDate) ?? new Set<string>()
        bucket.add(order.id)
        orderIdsByDate.set(orderDate, bucket)
      }
      const orderById = new Map(orders.map((order) => [order.id, order]))

      const sellerDailyStats: UpsertSellerDailyStatInput[] = []

      for (const date of datesToProcess) {
        const dateOrderIds = orderIdsByDate.get(date)
        const platformTotals = getPlatformTotals(platformTotalsByDate, date)

        for (const sellerId of sellerIdBatch) {
          const sellerOrderIds = orderIdsBySeller.get(sellerId) ?? []
          const sellerOrders = dateOrderIds
            ? sellerOrderIds
                .filter((id) => dateOrderIds.has(id))
                .map((id) => orderById.get(id))
                .filter((order): order is OrderAnalyticsRow => Boolean(order))
            : []

          // The seller's own onboarding-chosen currency, not the incidental
          // currency of any one order — stays correct even for a seller with
          // zero orders that day, and once global currencies launch this is
          // the currency a multi-currency-aware seller actually operates
          // (and gets paid out) in.
          const currencyCode = currencyBySeller.get(sellerId) ?? DEFAULT_CURRENCY_CODE
          const grossRevenue = sellerOrders.reduce(
            (sum, order) => sum + order.summary.accounting_total,
            0
          )
          const commissionTotal = sellerOrders.reduce(
            (sum, order) => sum + (commissionByOrderId.get(order.id) ?? 0),
            0
          )

          sellerDailyStats.push({
            seller_id: sellerId,
            date,
            currency_code: currencyCode,
            orders_count: sellerOrders.length,
            gross_revenue: roundCurrency(grossRevenue),
            net_earnings: roundCurrency(grossRevenue - commissionTotal),
            computed_at: now,
          })

          platformTotals.ordersCount += sellerOrders.length
          platformTotals.grossRevenue += grossRevenue
          platformTotals.commissionEarnings += commissionTotal
          if (sellerOrders.length > 0) {
            platformTotals.currencyCode = currencyCode
          }
        }
      }

      // Low stock is a snapshot of CURRENT inventory, not a historical
      // figure — computed once per seller per run regardless of how many
      // days are being backfilled, never repeated per date.
      const lowStockItems: {
        seller_id: string
        inventory_item_id: string
        product_title: string
        sku: string | null
        thumbnail: string | null
        available_quantity: number
        computed_at: Date
      }[] = []
      for (const sellerId of sellerIdBatch) {
        const lowStock = await loadLowStockForSeller(query, sellerId)
        for (const candidate of lowStock) {
          lowStockItems.push({
            seller_id: sellerId,
            inventory_item_id: candidate.inventory_item_id,
            product_title: candidate.product_title,
            sku: candidate.sku,
            thumbnail: candidate.thumbnail,
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

    for (const date of datesToProcess) {
      const dateTotals = getPlatformTotals(platformTotalsByDate, date)
      await computeSellerAnalyticsWorkflow(container).run({
        input: {
          sellerDailyStats: [],
          lowStock: { sellerIds: [], items: [] },
          platformDailyStat: {
            date,
            currency_code: dateTotals.currencyCode,
            orders_count: dateTotals.ordersCount,
            gross_revenue: roundCurrency(dateTotals.grossRevenue),
            commission_earnings: roundCurrency(dateTotals.commissionEarnings),
            total_products: platformTotals.totalProducts,
            total_sellers: platformTotals.totalSellers,
            total_customers: platformTotals.totalCustomers,
            computed_at: now,
          },
        },
      })
    }

    const todayTotals = getPlatformTotals(platformTotalsByDate, today)
    logger.info(
      `[${JOB_NAME}] materialized analytics for ${sellerIds.length} sellers across ` +
        `${datesToProcess.length} day(s) (${datesToProcess.join(", ")}), ` +
        `${todayTotals.ordersCount} orders today`
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
