import type { ReactNode } from "react"
import { Direction } from "radix-ui"

import { useDocumentDirection } from "../../hooks/use-document-direction"

/**
 * Radix primitives (tabs, radio groups, menus, selects) read their direction
 * from this context, not from `<html dir>`, and fall back to "ltr" without it —
 * so in ar/fa/he they stayed left-to-right inside an RTL page.
 */
export const DirectionProvider = ({
  children,
}: {
  children: ReactNode
}): ReactNode => {
  const dir = useDocumentDirection()

  return <Direction.Provider dir={dir ?? "ltr"}>{children}</Direction.Provider>
}
