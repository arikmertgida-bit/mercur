import { z } from "zod"
import { parseRows } from "./graph-schemas"
import { REFERENCE_PRICE_WINDOW_DAYS } from "../modules/variant-price-history"
import VariantPriceHistoryService from "../modules/variant-price-history/service"

export type ReferencePriceEntry = {
  amount: number
  has_full_history: boolean
}

const SnapshotRowSchema = z.object({
  variant_id: z.string(),
  // Postgres `numeric` columns come back from MikroORM as strings (precision
  // safety, not a JS number) — coerce, or every row silently fails Zod
  // validation and gets dropped by parseRows.
  amount: z.coerce.number(),
  captured_date: z.string(),
})

// en-CA formats as YYYY-MM-DD — the exact calendar-date string this module
// stores and compares against (Europe/Istanbul, so the daily snapshot job's
// "today" always matches what a Turkish customer/regulator would call today).
export function getIstanbulDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function subtractDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() - days)
  return result
}

function cutoffDateFor(discountStartsAt: string | undefined, now: Date): string {
  const start = discountStartsAt ? new Date(discountStartsAt) : now
  const anchor = start.getTime() < now.getTime() ? start : now
  return getIstanbulDateString(subtractDays(anchor, REFERENCE_PRICE_WINDOW_DAYS))
}

// Reduces the tracked snapshots per variant to a floor in application code
// (Math.min over the listed rows) — never a database-side MIN/GROUP BY, per
// the "no raw SQL in business logic" rule (README §II). The window starts
// REFERENCE_PRICE_WINDOW_DAYS before the variant's discount began (or before
// today when it has none) and runs to today, so a price raised during a
// long campaign never replaces the pre-campaign floor. `has_full_history`
// gates the storefront from ever showing a "was" price built on fewer than
// the full window's worth of real tracked days.
export async function loadReferencePrices(
  service: VariantPriceHistoryService,
  variantIds: string[],
  currencyCode: string,
  discountStartByVariantId: ReadonlyMap<string, string> = new Map()
): Promise<Map<string, ReferencePriceEntry>> {
  const result = new Map<string, ReferencePriceEntry>()
  if (variantIds.length === 0) {
    return result
  }

  const now = new Date()
  const cutoffByVariantId = new Map(
    variantIds.map((id) => [id, cutoffDateFor(discountStartByVariantId.get(id), now)] as const)
  )
  const earliestCutoff = [...cutoffByVariantId.values()].reduce((min, date) =>
    date < min ? date : min
  )

  const rows = await service.listVariantPriceSnapshots({
    variant_id: variantIds,
    currency_code: currencyCode,
    captured_date: { $gte: earliestCutoff },
  })

  const byVariant = new Map<string, { amounts: number[]; dates: Set<string> }>()
  for (const row of parseRows(SnapshotRowSchema, rows)) {
    const cutoff = cutoffByVariantId.get(row.variant_id)
    if (cutoff === undefined || row.captured_date < cutoff) {
      continue
    }
    const entry = byVariant.get(row.variant_id) ?? { amounts: [], dates: new Set<string>() }
    entry.amounts.push(row.amount)
    entry.dates.add(row.captured_date)
    byVariant.set(row.variant_id, entry)
  }

  for (const [variantId, entry] of byVariant) {
    result.set(variantId, {
      amount: Math.min(...entry.amounts),
      has_full_history: entry.dates.size >= REFERENCE_PRICE_WINDOW_DAYS,
    })
  }

  return result
}
