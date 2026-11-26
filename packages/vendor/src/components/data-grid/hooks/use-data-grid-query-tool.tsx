import { RefObject, useState } from "react"

import { DataGridQueryTool } from "../models"

export const useDataGridQueryTool = (
  containerRef: RefObject<HTMLElement | null>
) => {
  const [queryTool] = useState(() => new DataGridQueryTool(containerRef))

  return queryTool
}
