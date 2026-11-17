import { CellContext } from "@tanstack/react-table"
import { useMemo } from "react"
import { FieldError, FieldErrors, get } from "react-hook-form"

import { useDataGridContext } from "../context"
import { DataGridRowError } from "../types"
import { getCellCoordinates } from "../utils"

type UseDataGridCellErrorOptions<TData, TValue> = {
  context: CellContext<TData, TValue>
}

export const useDataGridCellError = <TextData, TValue>({
  context,
}: UseDataGridCellErrorOptions<TextData, TValue>) => {
  const { errors, getCellErrorMetadata, navigateToField } = useDataGridContext()

  const { row: rowIndex, col: columnIndex } = getCellCoordinates(context)

  const { accessor, field } = useMemo(() => {
    return getCellErrorMetadata({ row: rowIndex, col: columnIndex })
  }, [rowIndex, columnIndex, getCellErrorMetadata])

  const rowErrorsObject: FieldErrors | undefined =
    accessor && columnIndex === 0 ? get(errors, accessor) : undefined

  const rowErrors: DataGridRowError[] = []

  function collectErrors(
    errorObject: FieldErrors | FieldError | undefined,
    baseAccessor: string
  ) {
    if (!errorObject) {
      return
    }

    if (isFieldError(errorObject)) {
      // Handle a single FieldError directly
      const message = errorObject.message

      const to = () => navigateToField(baseAccessor)

      if (message) {
        rowErrors.push({ message, to })
      }
    } else {
      // Traverse nested objects
      Object.keys(errorObject).forEach((key) => {
        const nestedError = errorObject[key]
        const fieldAccessor = `${baseAccessor}.${key}`

        if (nestedError && typeof nestedError === "object") {
          collectErrors(nestedError, fieldAccessor)
        }
      })
    }
  }

  if (rowErrorsObject && accessor) {
    collectErrors(rowErrorsObject, accessor)
  }

  const cellError = field ? getCellError(errors, field, accessor) : undefined

  return {
    errors,
    rowErrors,
    cellError,
  }
}

/**
 * A cell shows its own error, or an error set on one of its parent paths
 * below the row: a schema rule such as "at least one price per variant" can
 * only be attached to `variants.N.prices`, not to a single currency cell.
 */
export function getCellError(
  errors: FieldErrors,
  field: string,
  rowAccessor: string | null
): FieldError | undefined {
  const own: FieldErrors | FieldError | undefined = get(errors, field)

  if (own && isFieldError(own)) {
    return own
  }

  if (!rowAccessor || !field.startsWith(`${rowAccessor}.`)) {
    return undefined
  }

  const segments = field.slice(rowAccessor.length + 1).split(".")

  for (let depth = segments.length - 1; depth > 0; depth--) {
    const parent: FieldErrors | FieldError | undefined = get(
      errors,
      [rowAccessor, ...segments.slice(0, depth)].join(".")
    )

    if (parent && isFieldError(parent)) {
      return parent
    }
  }

  return undefined
}

function isFieldError(errors: FieldErrors | FieldError): errors is FieldError {
  return typeof errors === "object" && "message" in errors && "type" in errors
}
