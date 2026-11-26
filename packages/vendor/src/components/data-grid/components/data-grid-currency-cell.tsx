import CurrencyInput, { CurrencyInputProps } from "react-currency-input-field"
import type { JsonValue } from "@mercurjs/types"
import { Controller, ControllerRenderProps } from "react-hook-form"

import { useCallback, useState } from "react"
import { useCombinedRefs } from "../../../hooks/use-combined-refs"
import { CurrencyInfo, currencies } from "../../../lib/data/currencies"
import { useDataGridCell, useDataGridCellError } from "../hooks"
import { DataGridCellProps, DataGridFormValues, InputProps } from "../types"
import { toInputValue } from "../utils"
import { DataGridCellContainer } from "./data-grid-cell-container"
import { useNumberInputLocale } from "../../../lib/number-input-locale"

export interface DataGridCurrencyCellProps<TData, TValue = JsonValue>
  extends DataGridCellProps<TData, TValue> {
  code: string
}

export const DataGridCurrencyCell = <TData, TValue = JsonValue>({
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
  field: ControllerRenderProps<DataGridFormValues, string>
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

  // No `currency` in intlConfig: the library would splice its own "₺"/"TRY "
  // prefix into the editable value, on top of the symbol <span> below.
  const numberInput = useNumberInputLocale()

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

  // `display` mirrors whatever separator convention the panel language
  // uses (e.g. "1050,00" in Turkish) purely for display —
  // it must never be written into the form directly. `canonical` tracks the
  // same amount as a locale-independent "." decimal string (from the
  // library's own `values.float`), which is what actually gets committed to
  // react-hook-form on blur, so a Turkish "1.050,00" always round-trips as
  // the number 1050, never as 1.05 or 0.
  //
  // When `value` changes externally it is already the canonical "." decimal
  // form (it comes straight from react-hook-form); it is mirrored only when
  // `formatter` accepted it as a real number, so a bad external value (or
  // stale "NaN") never becomes the new canonical value either.
  const toDraft = (next: JsonValue) => {
    const formatted = formatter(toInputValue(next))

    return {
      display: formatted,
      canonical: formatted === "" ? "" : String(next),
    }
  }

  const [draft, setDraft] = useState<{
    display: string | number
    canonical: string
  }>(() => toDraft(value))
  const decimalDigits = currencyInfo.decimal_digits
  const [synced, setSynced] = useState({ value, decimalDigits })

  if (synced.value !== value || synced.decimalDigits !== decimalDigits) {
    setSynced({ value, decimalDigits })
    setDraft(toDraft(value))
  }

  const localValue = draft.display

  const handleValueChange: CurrencyInputProps["onValueChange"] = (
    value,
    _name,
    values
  ) => {
    if (!value) {
      setDraft({ display: "", canonical: "" })
      return
    }

    // `values.float` is `null` for an empty/cleared input, but can also be
    // the actual number `NaN` for an unparseable one — guard both the same
    // way so a bad keystroke sequence can never poison the committed
    // (canonical) value with the literal string "NaN".
    const float = values?.float
    setDraft({
      display: value,
      canonical:
        typeof float === "number" && Number.isFinite(float) ? String(float) : "",
    })
  }

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

          onChange(draft.canonical, value)
        }}
        onFocus={onFocus}
        intlConfig={numberInput.intlConfig}
        decimalSeparator={numberInput.decimalSeparator}
        groupSeparator={numberInput.groupSeparator}
        decimalScale={currencyInfo.decimal_digits}
        decimalsLimit={currencyInfo.decimal_digits}
        autoComplete="off"
        tabIndex={-1}
      />
    </div>
  )
}
