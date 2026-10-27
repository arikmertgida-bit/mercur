import type { JsonValue } from "@mercurjs/types"
import { useCallback } from "react"
import { DataGridBulkUpdateCommand, DataGridMatrix } from "../models"
import { DataGridCoordinates } from "../types"

type UseDataGridMouseUpEventOptions<TData> = {
  matrix: DataGridMatrix<TData>
  anchor: DataGridCoordinates | null
  dragEnd: DataGridCoordinates | null
  setDragEnd: (coords: DataGridCoordinates | null) => void
  setRangeEnd: (coords: DataGridCoordinates | null) => void
  setIsSelecting: (isSelecting: boolean) => void
  setIsDragging: (isDragging: boolean) => void
  getSelectionValues: (fields: string[]) => JsonValue[]
  setSelectionValues: (fields: string[], values: JsonValue[]) => void
  execute: (command: DataGridBulkUpdateCommand) => void
  isDragging: boolean
}

export const useDataGridMouseUpEvent = <TData,>({
  matrix,
  anchor,
  dragEnd,
  setDragEnd,
  isDragging,
  setIsDragging,
  setRangeEnd,
  setIsSelecting,
  getSelectionValues,
  setSelectionValues,
  execute,
}: UseDataGridMouseUpEventOptions<TData>) => {
  const handleDragEnd = useCallback(() => {
    if (!isDragging) {
      return
    }

    if (!anchor || !dragEnd) {
      return
    }
    const dragSelection = matrix.getFieldsInSelection(anchor, dragEnd)
    const anchorField = matrix.getCellField(anchor)

    if (!anchorField || !dragSelection.length) {
      return
    }

    const anchorValue = getSelectionValues([anchorField])
    const fields = dragSelection.filter((field) => field !== anchorField)

    const prev = getSelectionValues(fields)
    const next = Array.from({ length: prev.length }, () => anchorValue[0])

    const command = new DataGridBulkUpdateCommand({
      fields,
      prev,
      next,
      setter: setSelectionValues,
    })

    execute(command)

    setIsDragging(false)
    setDragEnd(null)

    setRangeEnd(dragEnd)
  }, [
    isDragging,
    anchor,
    dragEnd,
    matrix,
    getSelectionValues,
    setSelectionValues,
    execute,
    setIsDragging,
    setDragEnd,
    setRangeEnd,
  ])

  const handleMouseUpEvent = useCallback(() => {
    handleDragEnd()
    setIsSelecting(false)
  }, [handleDragEnd, setIsSelecting])

  return {
    handleMouseUpEvent,
  }
}
