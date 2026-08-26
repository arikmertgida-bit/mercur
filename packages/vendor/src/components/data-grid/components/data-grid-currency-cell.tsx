import CurrencyInput, { CurrencyInputProps } from "react-currency-input-field"
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
            <Inner field={field} inputProps={input} currencyInfo={currency} />
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
}: {
  field: ControllerRenderProps<any, string>
  inputProps: InputProps
  currencyInfo: CurrencyInfo
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
  // seller's own convention — e.g. a Turkish seller types "1.050,00"
  // (dot-grouped, comma-decimal); parsing that against a hardcoded en-US
  // convention silently truncates it into "1.05" at the first unrecognised
  // separator. `intlConfig` drives both display formatting and input
  // parsing from the same Intl-derived rules, so the two can never disagree.
  //
  // Deliberately omits `currency`: passing it makes `react-currency-input-field`
  // derive its own currency-style prefix from `Intl.NumberFormat` (e.g. "₺"
  // or "TRY ") and splice it directly into the editable value on every
  // keystroke — on top of the currency symbol already rendered by the
  // `<span>` below, and on a separate code path (prefix stripping in the
  // library's `cleanValue`) that this cell never needs. Omitting `currency`
  // still yields locale-correct group/decimal separators (verified against
  // `Intl.NumberFormat(locale).formatToParts` — currency style changes
  // nothing about those) while keeping the input's own value pure digits,
  // exactly like the equivalent `@mercurjs/admin` cell.
  //
  // Deliberately `navigator.language`, not the dashboard's own `i18n.language`:
  // this package's language codes are its own internal identifiers, not all
  // valid BCP-47 tags (`zhCN`/`ptBR`/`ptPT` have no region subtag hyphen) —
  // feeding one straight into `Intl.NumberFormat` risks silently wrong
  // formatting for exactly the locales most likely to need this fix. Every
  // other Intl-based amount formatter in this package already resolves the
  // browser's own locale instead (see `getLocaleAmount` in
  // `lib/money-amount-helpers.ts`); this follows the same proven pattern.
  const intlConfig = useMemo(() => ({ locale: navigator.language }), [])

  // Pads/rounds to a canonical "." decimal string (e.g. "2500.00") without
  // any locale grouping. `CurrencyInput`'s own renderer (`getRenderValue`,
  // invoked because this cell always passes a defined `value` prop) re-runs
  // `formatValue` on whatever this returns to apply the active locale's
  // group and decimal separators. Grouping here too — e.g. via `formatValue`,
  // which also inserts the group separator — would hand that second pass an
  // already-grouped string; its decimal-separator swap then collides with
  // the existing group separator (Turkish's "2.500,00" becomes the
  // doubly-dotted, unparseable "2.500.00"), which renders as a literal
  // "NaN" for any amount that needs grouping (>= 1000 in most locales).
  const formatter = useCallback(
    (value?: string | number): string => {
      if (value === undefined || value === null || value === "") {
        return ""
      }

      const numeric = typeof value === "number" ? value : Number(value)

      if (!Number.isFinite(numeric)) {
        return ""
      }

      return numeric.toFixed(currencyInfo.decimal_digits)
    },
    [currencyInfo]
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
    // `values.float` is `null` for an empty/cleared input, but can also be
    // the actual number `NaN` for an unparseable one — guard both the same
    // way so a bad keystroke sequence can never poison the committed
    // (canonical) value with the literal string "NaN".
    const float = values?.float
    canonicalValueRef.current =
      typeof float === "number" && Number.isFinite(float) ? String(float) : ""
  }

  useEffect(() => {
    // The component we use is a bit fidly when the value is updated externally
    // so we need to ensure a format that will result in the cell being formatted correctly
    // according to the users locale on the next render.
    const formatted = formatter(value)

    // `value` here is already the canonical "." decimal form (it comes
    // straight from react-hook-form); mirror it only when `formatter`
    // actually accepted it as a real number, so a bad external value (or
    // stale "NaN") never becomes the new canonical value either.
    canonicalValueRef.current = formatted === "" ? "" : String(value)
    setLocalValue(formatted)
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
