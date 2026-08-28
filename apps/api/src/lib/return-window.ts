/**
 * Legal return/withdrawal window under Turkish Law No. 6502 on the
 * Protection of Consumers: 14 days from the date the order is delivered.
 */
export const RETURN_WINDOW_DAYS = 14

export interface ReturnWindowFulfillment {
  delivered_at: Date | string | null
  canceled_at: Date | string | null
}

function toValidDate(value: Date | string | null): Date | null {
  if (!value) {
    return null
  }
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Latest delivery timestamp across an order's fulfillments (an order can be
 * split into several fulfillments; the return window starts once everything
 * has arrived). Canceled fulfillments never carry a real delivery and are
 * excluded so a stray/void record can't spuriously anchor the window.
 */
export function getLatestDeliveryDate(
  fulfillments: ReturnWindowFulfillment[]
): Date | null {
  const deliveredDates: Date[] = []
  for (const fulfillment of fulfillments) {
    if (fulfillment.canceled_at) {
      continue
    }
    const date = toValidDate(fulfillment.delivered_at)
    if (date) {
      deliveredDates.push(date)
    }
  }

  if (deliveredDates.length === 0) {
    return null
  }

  return new Date(Math.max(...deliveredDates.map((date) => date.getTime())))
}

/** Whether a return may still be created for an order with these fulfillments. */
export function isReturnWindowOpen(
  fulfillments: ReturnWindowFulfillment[],
  now: Date = new Date()
): boolean {
  const deliveredAt = getLatestDeliveryDate(fulfillments)
  if (!deliveredAt) {
    return false
  }

  const deadline = new Date(
    deliveredAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000
  )
  return now.getTime() <= deadline.getTime()
}
