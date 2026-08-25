import CurrencyInput, {
  CurrencyInputProps,
  formatValue,
} from "react-currency-input-field"
import { Controller, ControllerRenderProps } from "react-hook-form"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useCombinedRefs } from "../../../hooks/use-combined-refs"
import { CurrencyInfo, currencies } from "../../../lib/data/currencies"
import { useDataGridCell, useDataGridCellError } from "../hooks"
import { DataGridCellProps, InputProps } from "../types"
import { DataGridCellContainer } from "./data-grid-cell-container"

export interface DataGridCurrencyCellProps<TData, TValue = any>
  extends DataGridCellProps<TData, TValue> {
  code: string
}

export const DataGridCurrencyCell = <TData, TValue = any>({
  context,
  code,
}: DataGridCurrencyCellProps<TData, TValue>) => {
  const { field, control, renderProps } = useDataGridCell({
    context,
  })
  const errorProps = useDataGridCellError({ context })

  const { container, input } = renderProps

  const currency = currencies[code.toUpperCase()]

  return (
    <Controller
      control={control}
      name={field}
      render={({ field }) => {
        return (
          <DataGridCellContainer {...container} {...errorProps}>
            <Inner
              field={field}
              inputProps={input}
              currencyInfo={currency}
              currencyCode={code.toUpperCase()}
            />
          </DataGridCellContainer>
        )
      }}
    />
  )
}

const Inner = ({
  field,
  inputProps,
  currencyInfo,
  currencyCode,
}: {
  field: ControllerRenderProps<any, string>
  inputProps: InputProps
  currencyInfo: CurrencyInfo
  currencyCode: string
}) => {
  const { value, onChange: _, onBlur, ref, ...rest } = field
  const {
    ref: inputRef,
    onBlur: onInputBlur,
    onFocus,
    onChange,
    ...attributes
  } = inputProps

  // Number formatting (thousands/decimal separators) must follow the
  // seller's own convention + the field's own currency — e.g. a Turkish
  // seller types "1.050,00" (dot-grouped, comma-decimal); parsing that
  // against a hardcoded en-US convention silently truncates it into "1.05"
  // at the first unrecognised separator. `intlConfig` drives both display
  // formatting and input parsing from the same Intl-derived rules, so the
  // two can never disagree.
  //
  // Deliberately `navigator.language`, not the dashboard's own `i18n.language`:
  // this package's language codes are its own internal identifiers, not all
  // valid BCP-47 tags (`zhCN`/`ptBR`/`ptPT` have no region subtag hyphen) —
  // feeding one straight into `Intl.NumberFormat` risks silently wrong
  // formatting for exactly the locales most likely to need this fix. Every
  // other Intl-based amount formatter in this package already resolves the
  // browser's own locale instead (see `getLocaleAmount` in
  // `lib/money-amount-helpers.ts`); this follows the same proven pattern.
  const intlConfig = useMemo(
    () => ({ locale: navigator.language, currency: currencyCode }),
    [currencyCode]
  )

  const formatter = useCallback(
    (value?: string | number) => {
      const ensuredValue =
        typeof value === "number" ? value.toString() : value || ""

      return formatValue({
        value: ensuredValue,
        decimalScale: currencyInfo.decimal_digits,
        intlConfig,
      })
    },
    [currencyInfo, intlConfig]
  )

  const [localValue, setLocalValue] = useState<string | number>(value || "")

  // `localValue` mirrors whatever separator convention the active locale
  // uses (e.g. "1050,00" once `intlConfig` is Turkish) purely for display —
  // it must never be written into the form directly. `canonicalValueRef`
  // tracks the same amount as a locale-independent "." decimal string (from
  // the library's own `values.float`), which is what actually gets
  // committed to react-hook-form on blur, so a Turkish "1.050,00" always
  // round-trips as the number 1050, never as 1.05 or 0.
  const canonicalValueRef = useRef<string>(
    typeof value === "string" || typeof value === "number" ? String(value) : ""
  )

  const handleValueChange: CurrencyInputProps["onValueChange"] = (
    value,
    _name,
    values
  ) => {
    if (!value) {
      setLocalValue("")
      canonicalValueRef.current = ""
      return
    }

    setLocalValue(value)
    canonicalValueRef.current =
      values?.float === null || values?.float === undefined
        ? ""
        : String(values.float)
  }

  useEffect(() => {
    let update = value

    // The component we use is a bit fidly when the value is updated externally
    // so we need to ensure a format that will result in the cell being formatted correctly
    // according to the users locale on the next render.
    if (!isNaN(Number(value))) {
      update = formatter(update)
      // `value` here is already the canonical "." decimal form (it comes
      // straight from react-hook-form), so the ref can just mirror it.
      canonicalValueRef.current = String(value)
    }

    setLocalValue(update)
  }, [value, formatter])

  const combinedRed = useCombinedRefs(inputRef, ref)

  return (
    <div className="relative flex size-full items-center">
      <span
        className="txt-compact-small text-ui-fg-muted pointer-events-none absolute left-0 w-fit min-w-4"
        aria-hidden
      >
        {currencyInfo.symbol_native}
      </span>
      <CurrencyInput
        {...rest}
        {...attributes}
        ref={combinedRed}
        className="txt-compact-small w-full flex-1 cursor-default appearance-none bg-transparent pl-8 text-right outline-none"
        value={localValue || undefined}
        onValueChange={handleValueChange}
        formatValueOnBlur
        onBlur={() => {
          onBlur()
          onInputBlur()

          onChange(canonicalValueRef.current, value)
        }}
        onFocus={onFocus}
        intlConfig={intlConfig}
        decimalScale={currencyInfo.decimal_digits}
        decimalsLimit={currencyInfo.decimal_digits}
        autoComplete="off"
        tabIndex={-1}
      />
    </div>
  )
}
