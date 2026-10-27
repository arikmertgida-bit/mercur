import { z } from "zod"

import { SEARCH_AREAS } from "./constants"

export const SearchAreaSchema = z.enum(SEARCH_AREAS)

export type SearchArea = z.infer<typeof SearchAreaSchema>

export type DynamicSearchResultItem = {
  id: string
  title: string
  subtitle?: string
  to: string
  thumbnail?: string
  value: string
}

export type DynamicSearchResult = {
  area: SearchArea
  title: string
  hasMore: boolean
  count: number
  items: DynamicSearchResultItem[]
}
