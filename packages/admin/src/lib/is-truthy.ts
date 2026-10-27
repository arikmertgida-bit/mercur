/**
 * Type guard for `Array.prototype.filter` that drops the falsy entries of a
 * list built with `condition && item`.
 */
export const isTruthy = <T>(
  value: T | false | null | undefined | 0 | ""
): value is T => Boolean(value)
