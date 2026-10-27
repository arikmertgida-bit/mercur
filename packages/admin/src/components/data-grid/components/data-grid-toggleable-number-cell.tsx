import { Switch } from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"
import CurrencyInput, { CurrencyInputProps } from "react-currency-input-field"
import type { JsonValue } from "@mercurjs/types"
import { Controller, ControllerRenderProps } from "react-hook-form"
import { useCombinedRefs } from "../../../hooks/use-combined-refs"
import { ConditionalTooltip } from "../../common/conditional-tooltip"
import { useDataGridCell, useDataGridCellError } from "../hooks"
import {
  DataGridCellProps,
  DataGridFormValues,
  DataGridToggleableNumber,
  DataGridToggleableNumberSchema,
  InputProps,
} from "../types"

const EMPTY_TOGGLEABLE_NUMBER: DataGridToggleableNumber = {
  quantity: "",
  checked: false,
  disabledToggle: false,
}

const toToggleableNumber = (value: JsonValue): DataGridToggleableNumber => {
  const parsed = DataGridToggleableNumberSchema.partial().safeParse(value)

  return parsed.success
    ? { ...EMPTY_TOGGLEABLE_NUMBER, ...parsed.data }
    : EMPTY_TOGGLEABLE_NUMBER
}
import { DataGridCellContainer } from "./data-grid-cell-container"

export const DataGridTogglableNumberCell = <TData, TValue = JsonValue>({
  context,
  disabledToggleTooltip,
  ...rest
}: DataGridCellProps<TData, TValue> & {
  min?: number
  max?: number
  placeholder?: string
  disabledToggleTooltip?: string
}) => {
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
          <DataGridCellContainer
            {...container}
            {...errorProps}
            outerComponent={
              <OuterComponent
                field={field}
                inputProps={input}
                isAnchor={container.isAnchor}
                tooltip={disabledToggleTooltip}
              />
            }
          >
            <Inner field={field} inputProps={input} {...rest} />
          </DataGridCellContainer>
        )
      }}
    />
  )
}

const OuterComponent = ({
  field,
  inputProps,
  isAnchor,
  tooltip,
}: {
  field: ControllerRenderProps<DataGridFormValues, string>
  inputProps: InputProps
  isAnchor: boolean
  tooltip?: string
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { value } = field
  const { onChange } = inputProps

  const [localValue, setLocalValue] = useState(() => toToggleableNumber(value))

  useEffect(() => {
    setLocalValue(toToggleableNumber(value))
  }, [value])

  const handleCheckedChange = (update: boolean) => {
    const newValue = { ...localValue, checked: update }

    if (!update && !newValue.disabledToggle) {
      newValue.quantity = ""
    }

    if (update && newValue.quantity === "") {
      newValue.quantity = 0
    }

    setLocalValue(newValue)
    onChange(newValue, value)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnchor && e.key.toLowerCase() === "x") {
        e.preventDefault()
        buttonRef.current?.click()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isAnchor])

  return (
    <ConditionalTooltip
      showTooltip={Boolean(localValue.disabledToggle && tooltip)}
      content={tooltip}
    >
      <div className="absolute inset-y-0 left-4 z-[3] flex w-fit items-center justify-center">
        <Switch
          dir="ltr"
          ref={buttonRef}
          size="small"
          className="shrink-0 rtl:rotate-180"
          checked={Boolean(localValue?.checked)}
          disabled={Boolean(localValue?.disabledToggle)}
          onCheckedChange={handleCheckedChange}
        />
      </div>
    </ConditionalTooltip>
  )
}

const Inner = ({
  field,
  inputProps,
  placeholder,
  ...props
}: {
  field: ControllerRenderProps<DataGridFormValues, string>
  inputProps: InputProps
  min?: number
  max?: number
  placeholder?: string
}) => {
  const { ref, value, onChange: _, onBlur, ...fieldProps } = field
  const {
    ref: inputRef,
    onChange,
    onBlur: onInputBlur,
    onFocus,
    ...attributes
  } = inputProps

  const [localValue, setLocalValue] = useState(() => toToggleableNumber(value))

  useEffect(() => {
    setLocalValue(toToggleableNumber(value))
  }, [value])

  const combinedRefs = useCombinedRefs(inputRef, ref)

  const handleInputChange: CurrencyInputProps["onValueChange"] = (
    updatedValue,
    _name,
    _values
  ) => {
    const ensuredValue = updatedValue !== undefined ? updatedValue : ""
    const newValue = { ...localValue, quantity: ensuredValue }

    /**
     * If the value is not empty, then the location should be enabled.
     *
     * Else, if the value is empty and the location is enabled, then the
     * location should be disabled, unless toggling the location is disabled.
     */
    if (ensuredValue !== "") {
      newValue.checked = true
    } else if (newValue.checked && newValue.disabledToggle === false) {
      newValue.checked = false
    }

    setLocalValue(newValue)
  }

  const handleOnChange = () => {
    const next =
      localValue.disabledToggle && localValue.quantity === ""
        ? { ...localValue, quantity: 0 }
        : localValue

    onChange(next, value)
  }

  return (
    <div className="flex size-full items-center gap-x-2">
      <CurrencyInput
        {...fieldProps}
        {...attributes}
        {...props}
        ref={combinedRefs}
        className="txt-compact-small w-full flex-1 cursor-default appearance-none bg-transparent pl-8 text-right outline-none"
        value={localValue.quantity}
        onValueChange={handleInputChange}
        formatValueOnBlur
        onBlur={() => {
          onBlur()
          onInputBlur()
          handleOnChange()
        }}
        onFocus={onFocus}
        decimalsLimit={0}
        autoComplete="off"
        tabIndex={-1}
        placeholder={!localValue?.checked ? placeholder : undefined}
      />
    </div>
  )
}
