import type { JsonValue } from "@mercurjs/types"
import { useCallback } from "react"

import { DataGridBulkUpdateCommand, DataGridMatrix } from "../models"
import { DataGridCoordinates } from "../types"

type UseDataGridClipboardEventsOptions<TData> = {
  matrix: DataGridMatrix<TData>
  isEditing: boolean
  anchor: DataGridCoordinates | null
  rangeEnd: DataGridCoordinates | null
  getSelectionValues: (fields: string[]) => JsonValue[]
  setSelectionValues: (fields: string[], values: JsonValue[]) => void
  execute: (command: DataGridBulkUpdateCommand) => void
}

export const useDataGridClipboardEvents = <TData,>({
  matrix,
  anchor,
  rangeEnd,
  isEditing,
  getSelectionValues,
  setSelectionValues,
  execute,
}: UseDataGridClipboardEventsOptions<TData>) => {
  const handleCopyEvent = useCallback(
    (e: ClipboardEvent) => {
      if (isEditing || !anchor || !rangeEnd) {
        return
      }

      e.preventDefault()

      const fields = matrix.getFieldsInSelection(anchor, rangeEnd)
      const values = getSelectionValues(fields)

      const text = values
        .map((value) => {
          if (typeof value === "object" && value !== null) {
            return JSON.stringify(value)
          }
          return value == null ? "" : `${value}`
        })
        .join("\t")

      e.clipboardData?.setData("text/plain", text)
    },
    [isEditing, anchor, rangeEnd, matrix, getSelectionValues]
  )

  const handlePasteEvent = useCallback(
    (e: ClipboardEvent) => {
      if (isEditing || !anchor || !rangeEnd) {
        return
      }

      e.preventDefault()

      const text = e.clipboardData?.getData("text/plain")

      if (!text) {
        return
      }

      const next = text.split("\t")

      const fields = matrix.getFieldsInSelection(anchor, rangeEnd)
      const prev = getSelectionValues(fields)

      const command = new DataGridBulkUpdateCommand({
        fields,
        next,
        prev,
        setter: setSelectionValues,
      })

      execute(command)
    },
    [
      isEditing,
      anchor,
      rangeEnd,
      matrix,
      getSelectionValues,
      setSelectionValues,
      execute,
    ]
  )

  return {
    handleCopyEvent,
    handlePasteEvent,
  }
}
