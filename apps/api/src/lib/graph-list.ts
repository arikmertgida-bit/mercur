/**
 * query.graph types every related list as `Maybe<T>[] | null` (Medusa's
 * generated `Maybe<T> = T | null`), so a row type that reads such a list
 * must admit null items.
 */
export type GraphList<T> = ReadonlyArray<T | null> | null

/** The non-null items of a query.graph related list. */
export const presentItems = <T>(
  list: ReadonlyArray<T | null> | null | undefined
): T[] => (list ?? []).filter((item): item is T => item !== null)
