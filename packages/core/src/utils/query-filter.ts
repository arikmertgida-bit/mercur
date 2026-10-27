/**
 * A `query.graph` / module-service filter: field names mapped to values or
 * operator objects (`$in`, `$lt`, `$or`, ...), nested arbitrarily deep.
 */
export type QueryFilterScalar = string | number | boolean | Date | null

export type QueryFilterValue =
  | QueryFilterScalar
  | readonly QueryFilterValue[]
  | QueryFilter

export interface QueryFilter {
  [key: string]: QueryFilterValue | undefined
}

/** A filter whose `$and` clauses a middleware appends to. */
export type AndQueryFilter = QueryFilter & {
  $and?: QueryFilter[]
}
