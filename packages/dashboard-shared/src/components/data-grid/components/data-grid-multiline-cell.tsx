import { clx } from "@medusajs/ui"
import { useCallback, useEffect, useRef, useState } from "react"
import type { JsonValue } from "@mercurjs/types"
import { Controller, ControllerRenderProps } from "react-hook-form"

import { useCombinedRefs } from "../../../hooks/use-combined-refs"
import { useDataGridCell, useDataGridCellError } from "../hooks"
import { DataGridCellProps, DataGridFormValues, InputProps } from "../types"
import { toInputValue } from "../utils"
import { DataGridCellContainer } from "./data-grid-cell-container"

export const DataGridMultilineCell = <TData, TValue = JsonValue>({
  context,
}: DataGridCellProps<TData, TValue>) => {
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
          <DataGridCellContainer {...container} {...errorProps} isMultiLine>
            <Inner field={field} inputProps={input} />
          </DataGridCellContainer>
        )
      }}
    />
  )
}

const Inner = ({
  field,
  inputProps,
}: {
  field: ControllerRenderProps<DataGridFormValues, string>
  inputProps: InputProps
}) => {
  const { onChange: _, onBlur, ref, value, ...rest } = field
  const { ref: inputRef, onBlur: onInputBlur, onChange, ...input } = inputProps

  const [localValue, setLocalValue] = useState<JsonValue>(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const combinedRefs = useCombinedRefs(inputRef, ref, textareaRef)

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // Reset height to 0 to get accurate scrollHeight
      textarea.style.height = "0px"
      // Set the height to match content (minimum 24px for min visible height)
      const newHeight = Math.max(textarea.scrollHeight, 24)
      textarea.style.height = `${newHeight}px`
    }
  }, [])

  // Adjust height when value changes
  useEffect(() => {
    adjustTextareaHeight()
  }, [localValue, adjustTextareaHeight])

  useEffect(() => {
    // Immediate adjustment
    adjustTextareaHeight()
    // Delayed adjustment to handle any layout shifts
    const timeoutId = setTimeout(adjustTextareaHeight, 50)
    return () => clearTimeout(timeoutId)
  }, [adjustTextareaHeight])

  return (
    <textarea
      className={clx(
        "txt-compact-small text-ui-fg-subtle flex w-full cursor-pointer bg-transparent outline-none",
        "focus:cursor-text",
        "resize-none overflow-hidden py-2"
      )}
      autoComplete="off"
      tabIndex={-1}
      value={toInputValue(localValue)}
      onChange={(e) => {
        setLocalValue(e.target.value)
        adjustTextareaHeight()
      }}
      ref={combinedRefs}
      onBlur={() => {
        onBlur()
        onInputBlur()
        onChange(localValue, value)
      }}
      {...input}
      {...rest}
    />
  )
}

