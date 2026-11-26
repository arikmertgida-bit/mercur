export type Keyed<T> = { key: string; item: T }

/**
 * Pairs each item with a React key built from its content. Items whose
 * content repeats get an occurrence suffix, so keys stay unique and follow
 * the item (not its position) when other items are added or removed.
 */
export const withContentKeys = <T>(
  items: readonly T[],
  getContentKey: (item: T) => string
): Keyed<T>[] => {
  const seen = new Map<string, number>()

  return items.map((item) => {
    const base = getContentKey(item)
    const occurrence = seen.get(base) ?? 0
    seen.set(base, occurrence + 1)

    return {
      key: occurrence === 0 ? base : `${base}#${occurrence}`,
      item,
    }
  })
}
