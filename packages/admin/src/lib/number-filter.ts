import type {
  NumberFilterValue,
  RangeNumberFilterValue,
} from "@mercurjs/dashboard-shared"

const toBound = (value: string | number | undefined): number | undefined => {
  if (value === undefined || value === "") {
    return undefined
  }

  const numeric = Number(value)

  return Number.isFinite(numeric) ? numeric : undefined
}

/**
 * Maps the legacy table `NumberFilter` chip's URL value (an exact number, or
 * `gt` / `lt` bounds holding the raw input text) onto the API's number
 * operator map (`$gt` / `$lt`).
 */
export const toNumberFilterValue = (
  value: RangeNumberFilterValue | undefined
): NumberFilterValue | undefined => {
  if (value === undefined || typeof value === "number") {
    return value
  }

  const gt = toBound(value.gt)
  const lt = toBound(value.lt)

  if (gt === undefined && lt === undefined) {
    return undefined
  }

  return {
    ...(gt !== undefined && { $gt: gt }),
    ...(lt !== undefined && { $lt: lt }),
  }
}
