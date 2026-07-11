import { useCallback } from "react"
import { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form"

import { DataGridMatrix } from "../models"
import {
  DataGridCellValue,
  DataGridColumnType,
  DataGridCoordinates,
  DataGridToggleableNumber,
} from "../types"

type UseDataGridFormHandlersOptions<TData, TFieldValues extends FieldValues> = {
  matrix: DataGridMatrix<TData, TFieldValues>
  form: UseFormReturn<TFieldValues>
  anchor: DataGridCoordinates | null
}

export const useDataGridFormHandlers = <
  TData,
  TFieldValues extends FieldValues
>({
  matrix,
  form,
  anchor,
}: UseDataGridFormHandlersOptions<TData, TFieldValues>) => {
  const { getValues, reset } = form

  const getSelectionValues = useCallback(
    (fields: string[]): PathValue<TFieldValues, Path<TFieldValues>>[] => {
      if (!fields.length) {
        return []
      }

      const allValues = getValues()

      return fields.map((field) => {
        return field.split(".").reduce((obj, key) => obj?.[key], allValues)
      }) as PathValue<TFieldValues, Path<TFieldValues>>[]
    },
    [getValues]
  )

  const setSelectionValues = useCallback(
    async (fields: string[], values: DataGridCellValue[], isHistory?: boolean) => {
      if (!fields.length || !anchor) {
        return
      }

      const type = matrix.getCellType(anchor)
      if (!type) {
        return
      }

      const convertedValues = convertArrayToPrimitive(values, type)
      const currentValues = getValues()

      fields.forEach((field, index) => {
        if (!field) {
          return
        }

        const valueIndex = index % values.length
        const newValue = convertedValues[valueIndex]

        setValue(currentValues, field, newValue, type, isHistory)
      })

      reset(currentValues, {
        keepDirty: true,
        keepTouched: true,
        keepDefaultValues: true,
      })
    },
    [matrix, anchor, getValues, reset]
  )

  return {
    getSelectionValues,
    setSelectionValues,
  }
}

function convertToNumber(value: string | number): number {
  if (typeof value === "number") {
    return value
  }

  const converted = Number(value)

  if (isNaN(converted)) {
    throw new Error(`String "${value}" cannot be converted to number.`)
  }

  return converted
}

function convertToBoolean(value: string | boolean): boolean {
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "undefined" || value === null) {
    return false
  }

  const lowerValue = value.toLowerCase()

  if (lowerValue === "true" || lowerValue === "false") {
    return lowerValue === "true"
  }

  throw new Error(`String "${value}" cannot be converted to boolean.`)
}

function covertToString(value: DataGridCellValue): string {
  if (typeof value === "undefined" || value === null) {
    return ""
  }

  return String(value)
}

function convertToggleableNumber(value: DataGridCellValue): {
  quantity: number
  checked: boolean
  disabledToggle: boolean
} {
  let obj = value

  if (typeof obj === "string") {
    try {
      obj = JSON.parse(obj)
    } catch (error) {
      throw new Error(`String "${value}" cannot be converted to object.`, { cause: error })
    }
  }

  return obj as DataGridToggleableNumber
}

function setValue(
  currentValues: Record<string, unknown>,
  field: string,
  newValue: DataGridCellValue,
  type: string,
  isHistory?: boolean
) {
  if (type !== "togglable-number") {
    field.split(".").reduce<Record<string, unknown>>((curr, key, index) => {
      if (index === field.split(".").length - 1) {
        curr[key] = newValue
      }
      curr[key] ??= {}
      return curr[key] as Record<string, unknown>
    }, currentValues)
    return
  }

  // `type === "togglable-number"` guarantees newValue is a DataGridToggleableNumber here.
  setValueToggleableNumber(
    currentValues,
    field,
    newValue as DataGridToggleableNumber,
    isHistory
  )
}

function setValueToggleableNumber(
  currentValues: Record<string, unknown> = {},
  field: string,
  newValue: DataGridToggleableNumber,
  isHistory?: boolean
) {
  const currentValue = field
    .split(".")
    .reduce<Record<string, unknown> | undefined>(
      (obj, key) => obj?.[key] as Record<string, unknown> | undefined,
      currentValues
    )
  const { disabledToggle } = (currentValue as DataGridToggleableNumber) || {}

  const normalizeQuantity = (value: number | string | null | undefined) => {
    if (disabledToggle && value === "") {
      return 0
    }
    return value
  }

  const determineChecked = (quantity: number | string | null | undefined) => {
    if (disabledToggle) {
      return true
    }
    return quantity !== "" && quantity != null
  }

  const quantity = normalizeQuantity(newValue.quantity)
  const checked = isHistory
    ? disabledToggle
      ? true
      : newValue.checked
    : determineChecked(quantity)

  const fieldParts = field.split(".")
  fieldParts.reduce<Record<string, unknown>>((curr, key, index) => {
    if (index === fieldParts.length - 1) {
      curr[key] = {
        ...(currentValue || {}),
        quantity,
        checked,
        disabledToggle: disabledToggle ?? false,
      }
    }
    curr[key] ??= {}
    return curr[key] as Record<string, unknown>
  }, currentValues)
}

export function convertArrayToPrimitive(
  values: DataGridCellValue[],
  type: DataGridColumnType
): DataGridCellValue[] {
  switch (type) {
    case "number":
      return values.map((v) => {
        if (v === "") {
          return v
        }

        if (v == null) {
          return ""
        }

        // `type` guarantees the caller only passes number-like cell values here.
        return convertToNumber(v as string | number)
      })
    case "togglable-number":
      return values.map(convertToggleableNumber)
    case "boolean":
      // `type` guarantees the caller only passes boolean-like cell values here.
      return values.map((v) => convertToBoolean(v as string | boolean))
    case "text":
    case "multiline-text":
      return values.map(covertToString)
    default:
      throw new Error(`Unsupported target type "${type}".`)
  }
}
