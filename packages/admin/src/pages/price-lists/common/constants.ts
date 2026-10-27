/**
 * Re-implementation of enum from `@medusajs/medusa` as it cannot be imported
 */
export const PriceListStatus = {
  ACTIVE: "active",
  DRAFT: "draft",
} as const

export type PriceListStatus =
  (typeof PriceListStatus)[keyof typeof PriceListStatus]

export const PriceListDateStatus = {
  SCHEDULED: "scheduled",
  EXPIRED: "expired",
} as const

export type PriceListDateStatus =
  (typeof PriceListDateStatus)[keyof typeof PriceListDateStatus]

/**
 * Re-implementation of enum from `@medusajs/medusa` as it cannot be imported
 */
export const PriceListType = {
  SALE: "sale",
  OVERRIDE: "override",
} as const

export type PriceListType = (typeof PriceListType)[keyof typeof PriceListType]
