import { Checkbox } from "@medusajs/ui"
import type { JsonValue } from "@mercurjs/types"
import { Controller, ControllerRenderProps } from "react-hook-form"

import { useCombinedRefs } from "../../../hooks/use-combined-refs"
import { useDataGridCell, useDataGridCellError } from "../hooks"
import { DataGridCellProps, DataGridFormValues, InputProps } from "../types"
import { DataGridCellContainer } from "./data-grid-cell-container"

export const DataGridBooleanCell = <TData, TValue = JsonValue>({
  context,
  disabled,
}: DataGridCellProps<TData, TValue> & { disabled?: boolean }) => {
  const { field, control, renderProps } = useDataGridCell({
    context,
  })
  const errorProps = useDataGridCellError({ context })

  const { container, input } = renderProps

  return (
    <Controller
      control={control}
      name={field}
      render={({ field }) => {
        return (
          <DataGridCellContainer {...container} {...errorProps}>
            <Inner field={field} inputProps={input} disabled={disabled} />
          </DataGridCellContainer>
        )
      }}
    />
  )
}

const Inner = ({
  field,
  inputProps,
  disabled,
}: {
  field: ControllerRenderProps<DataGridFormValues, string>
  inputProps: InputProps
  disabled?: boolean
}) => {
  const { ref, value, onBlur, name, disabled: fieldDisabled } = field
  const {
    ref: inputRef,
    onBlur: onInputBlur,
    onChange,
    onFocus,
    ...attributes
  } = inputProps

  const combinedRefs = useCombinedRefs(ref, inputRef)

  return (
    <Checkbox
      disabled={disabled || fieldDisabled}
      name={name}
      checked={value === true}
      onCheckedChange={(newValue) => onChange(newValue === true, value)}
      onFocus={onFocus}
      onBlur={() => {
        onBlur()
        onInputBlur()
      }}
      ref={combinedRefs}
      tabIndex={-1}
      {...attributes}
    />
  )
}
