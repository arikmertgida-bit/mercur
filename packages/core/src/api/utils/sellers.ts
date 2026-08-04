import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { SellerStatus } from "@mercurjs/types"

/**
 * A seller is outside an active closure window when: it has never scheduled
 * one, the scheduled window hasn't started yet, or the window has already
 * ended. Note this must stay a single `$or` of three branches, not an `$and`
 * of two `$or`s (closed_from-not-started AND closed_to-already-ended) — that
 * older shape required BOTH branches to hold simultaneously, which made a
 * closure permanently hide the seller even after `closed_to` passed, and
 * hid a future-scheduled closure before it had even started.
 */
export const buildSellerOutsideClosureWindowFilter = (
  now: Date
): { $or: object[] } => ({
  $or: [
    { closed_from: null },
    { closed_from: { $gt: now } },
    { closed_to: { $lt: now } },
  ],
})

export const resolveVisibleSellerIds = async (
  scope: MedusaContainer
): Promise<string[]> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const now = new Date()

  const { data: visibleSellers } = await query.graph({
    entity: "seller",
    fields: ["id"],
    filters: {
      status: SellerStatus.OPEN,
      ...buildSellerOutsideClosureWindowFilter(now),
    },
  })

  return visibleSellers.map((s: { id: string }) => s.id)
}

export type SellerClosureFields = {
  status: string
  closed_from: Date | string | null
  closed_to: Date | string | null
}

/**
 * In-memory twin of `status: SellerStatus.OPEN` + `buildSellerOutsideClosureWindowFilter`
 * for callers that already hold seller rows fetched via `query.graph` (e.g. a
 * campaign's linked seller) instead of running a fresh filtered query. Keep
 * the three-branch closure logic in sync with the query-filter version above.
 */
export const isSellerVisible = (
  seller: SellerClosureFields,
  now: Date
): boolean => {
  if (seller.status !== SellerStatus.OPEN) {
    return false
  }
  if (!seller.closed_from) {
    return true
  }
  if (new Date(seller.closed_from) > now) {
    return true
  }
  if (!seller.closed_to) {
    return false
  }
  return new Date(seller.closed_to) < now
}
