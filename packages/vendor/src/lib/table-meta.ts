import { RowData, TableMeta } from "@tanstack/react-table"
import { z } from "zod"

/**
 * Reads a string value a table was given through `meta` (e.g. the id of the
 * entity the rows belong to). TanStack's `TableMeta` is not augmented here,
 * so the value is validated at runtime.
 */
export const getTableMetaString = <TData extends RowData>(
  meta: TableMeta<TData> | undefined,
  key: string
): string | undefined => {
  const parsed = z.object({ [key]: z.string() }).safeParse(meta)

  return parsed.success ? parsed.data[key] : undefined
}
