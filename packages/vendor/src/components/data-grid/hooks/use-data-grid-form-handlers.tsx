import type { JsonValue } from "@mercurjs/types"
import { useCallback } from "react"
import { z } from "zod"

import { isJsonObject, JsonValueSchema } from "@mercurjs/dashboard-shared"

import { DataGridMatrix } from "../models"
import {
  DataGridColumnType,
  DataGridCoordinates,
  DataGridForm,
  DataGridFormValues,
  DataGridToggleableNumber,
} from "../types"
import { getValueAtPath, setValueAtPath } from "../utils"

type UseDataGridFormHandlersOptions<TData> = {
  matrix: DataGridMatrix<TData>
  form: DataGridForm
  anchor: DataGridCoordinates | null
}

export const useDataGridFormHandlers = <TData,>({
  matrix,
  form,
  anchor,
}: UseDataGridFormHandlersOptions<TData>) => {
  const { getValues, reset } = form

  const getSelectionValues = useCallback(
    (fields: string[]): JsonValue[] => {
      if (!fields.length) {
        return []
      }

      const allValues = getValues()

      return fields.map((field) => getValueAtPath(allValues, field) ?? null)
    },
    [getValues]
  )

  const setSelectionValues = useCallback(
    async (fields: string[], values: JsonValue[], isHistory?: boolean) => {
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

function convertToNumber(value: JsonValue): number {
  if (typeof value === "number") {
    return value
  }

  const converted = Number(value)

  if (isNaN(converted)) {
    throw new Error(`String "${value}" cannot be converted to number.`)
  }

  return converted
}

function convertToBoolean(value: JsonValue): boolean {
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "undefined" || value === null) {
    return false
  }

  if (typeof value !== "string") {
    throw new Error(`Value "${value}" cannot be converted to boolean.`)
  }

  const lowerValue = value.toLowerCase()

  if (lowerValue === "true" || lowerValue === "false") {
    return lowerValue === "true"
  }

  throw new Error(`String "${value}" cannot be converted to boolean.`)
}

function covertToString(value: JsonValue): string {
  if (typeof value === "undefined" || value === null) {
    return ""
  }

  return String(value)
}

/**
 * A pasted or restored togglable-number value: an object whose `checked` /
 * `disabledToggle` entries are read as truthy flags.
 */
const ToggleableNumberInputSchema = z.object({
  quantity: z.union([z.number(), z.string()]).optional(),
  checked: JsonValueSchema.optional(),
  disabledToggle: JsonValueSchema.optional(),
})

const ToggleableNumberStateSchema = z.object({
  disabledToggle: z.boolean().optional(),
})

function parseJsonText(value: string): JsonValue {
  try {
    return JsonValueSchema.parse(JSON.parse(value))
  } catch (error) {
    const reason = error instanceof Error ? ` ${error.message}` : ""
    throw new Error(`String "${value}" cannot be converted to object.${reason}`)
  }
}

function convertToggleableNumber(value: JsonValue): DataGridToggleableNumber {
  const obj = typeof value === "string" ? parseJsonText(value) : value
  const parsed = ToggleableNumberInputSchema.safeParse(obj)

  if (!isJsonObject(obj) || !parsed.success) {
    throw new Error(`Value cannot be converted to togglable number.`)
  }

  return {
    quantity: parsed.data.quantity ?? "",
    checked: Boolean(parsed.data.checked),
    disabledToggle: Boolean(parsed.data.disabledToggle),
  }
}

function setValue(
  currentValues: DataGridFormValues,
  field: string,
  newValue: JsonValue,
  type: DataGridColumnType,
  isHistory?: boolean
) {
  if (type !== "togglable-number") {
    setValueAtPath(currentValues, field, newValue)
    return
  }

  setValueToggleableNumber(
    currentValues,
    field,
    convertToggleableNumber(newValue),
    isHistory
  )
}

function setValueToggleableNumber(
  currentValues: DataGridFormValues,
  field: string,
  newValue: DataGridToggleableNumber,
  isHistory?: boolean
) {
  const currentValue = getValueAtPath(currentValues, field)
  const currentState = ToggleableNumberStateSchema.safeParse(currentValue)
  const disabledToggle = currentState.success
    ? currentState.data.disabledToggle
    : undefined

  const normalizeQuantity = (value: number | string) => {
    if (disabledToggle && value === "") {
      return 0
    }
    return value
  }

  const determineChecked = (quantity: number | string) => {
    if (disabledToggle) {
      return true
    }
    return quantity !== ""
  }

  const quantity = normalizeQuantity(newValue.quantity)
  const checked = isHistory
    ? disabledToggle
      ? true
      : newValue.checked
    : determineChecked(quantity)

  const currentFields = isJsonObject(currentValue) ? currentValue : {}

  setValueAtPath(currentValues, field, {
    ...currentFields,
    quantity,
    checked,
    disabledToggle: disabledToggle ?? false,
  })
}

export function convertArrayToPrimitive(
  values: JsonValue[],
  type: DataGridColumnType
): JsonValue[] {
  switch (type) {
    case "number":
      return values.map((v) => {
        if (v === "") {
          return v
        }

        if (v == null) {
          return ""
        }

        return convertToNumber(v)
      })
    case "togglable-number":
      return values.map(convertToggleableNumber)
    case "boolean":
      return values.map(convertToBoolean)
    case "text":
    case "multiline-text":
      return values.map(covertToString)
    default:
      throw new Error(`Unsupported target type "${type}".`)
  }
}
