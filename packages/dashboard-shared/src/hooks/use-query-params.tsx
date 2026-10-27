import { useSearchParams } from "react-router-dom"

type QueryParams<T extends string> = Partial<Record<T, string>>

export function useQueryParams<T extends string>(
  keys: T[],
  prefix?: string
): QueryParams<T> {
  const [params] = useSearchParams()

  const result: QueryParams<T> = {}

  keys.forEach((key) => {
    const prefixedKey = prefix ? `${prefix}_${key}` : key
    const value = params.get(prefixedKey) || undefined

    result[key] = value
  })

  return result
}
