import { castNumber } from "./cast-number"

/**
 * Normalizes an empty form value (blank string or empty array) to `null`
 * (the default, for fields the backend should clear) or to `undefined`
 * (`nullify: false`, for fields the backend should leave out).
 */
export function transformNullableFormValue<T>(value: T, nullify?: true): T | null
export function transformNullableFormValue<T>(
  value: T,
  nullify: false
): T | undefined
export function transformNullableFormValue<T>(
  value: T,
  nullify = true
): T | undefined | null {
  if (typeof value === "string" && value.trim() === "") {
    return nullify ? null : undefined
  }

  if (Array.isArray(value) && value.length === 0) {
    return nullify ? null : undefined
  }

  return value
}

/**
 * Casts a numeric form value, normalizing an empty one to `null` (the
 * default) or to `undefined` (`nullify: false`).
 */
export function transformNullableFormNumber(
  value?: string | number,
  nullify?: true
): number | null
export function transformNullableFormNumber(
  value: string | number | undefined,
  nullify: false
): number | undefined
export function transformNullableFormNumber(
  value?: string | number,
  nullify = true
): number | null | undefined {
  if (
    typeof value === "undefined" ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return nullify ? null : undefined
  }

  if (typeof value === "string") {
    return castNumber(value)
  }

  return value
}
