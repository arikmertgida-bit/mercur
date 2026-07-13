// Normalizes a query param that may arrive as a single value, a comma-joined
// value, or (via repeated `key=a&key=b`) an array — matching how the
// storefront's `appendRepeatedParam` builds these query strings.
export function toStringArray(value: string | string[] | undefined): string[] {
  if (value === undefined) {
    return []
  }
  const raw = Array.isArray(value) ? value : [value]
  return raw
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}
