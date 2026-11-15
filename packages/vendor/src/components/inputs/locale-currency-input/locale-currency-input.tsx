import { CurrencyInput } from "@medusajs/ui"
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
} from "react"
import type { CurrencyInputProps as PrimitiveProps } from "react-currency-input-field"

import { useNumberInputLocale } from "@lib/number-input-locale"

type BaseCurrencyInputProps = Omit<
  PrimitiveProps,
  "prefix" | "suffix" | "size"
> & {
  symbol: string
  code: string
  size?: "small" | "base"
}

type LocaleCurrencyInputProps = Omit<
  BaseCurrencyInputProps,
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "onChange"
  | "intlConfig"
  | "decimalSeparator"
  | "groupSeparator"
> & {
  value: number | string | null | undefined
  onValueChange: (value: number | null) => void
}

const toAmount = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") {
    return null
  }
  const amount = typeof value === "number" ? value : Number(value)
  return Number.isFinite(amount) ? amount : null
}

/**
 * CurrencyInput that types and shows amounts in the panel language (tr
 * "1.050,50", en "1,050.50") but only ever reports a plain number. The text
 * the user is typing ("10,") stays local, because feeding the parsed number
 * back as `value` would swallow a trailing decimal separator.
 */
export const LocaleCurrencyInput = forwardRef<
  HTMLInputElement,
  LocaleCurrencyInputProps
>(({ value, onValueChange, ...props }, ref) => {
  const numberInput = useNumberInputLocale()
  const reported = useRef<number | null>(toAmount(value))
  const [text, setText] = useState<string>(() => {
    const amount = toAmount(value)
    return amount === null ? "" : String(amount)
  })

  useEffect(() => {
    const amount = toAmount(value)
    if (amount !== reported.current) {
      reported.current = amount
      setText(amount === null ? "" : String(amount))
    }
  }, [value])

  return (
    <CurrencyInput
      {...props}
      ref={ref}
      intlConfig={numberInput.intlConfig}
      decimalSeparator={numberInput.decimalSeparator}
      groupSeparator={numberInput.groupSeparator}
      value={text}
      onValueChange={(nextText, _name, values) => {
        const float = values?.float
        const amount =
          nextText && typeof float === "number" && Number.isFinite(float)
            ? float
            : null
        setText(nextText ?? "")
        reported.current = amount
        onValueChange(amount)
      }}
    />
  )
})
LocaleCurrencyInput.displayName = "LocaleCurrencyInput"

type PanelCurrencyInputProps = Omit<
  BaseCurrencyInputProps,
  "intlConfig" | "decimalSeparator" | "groupSeparator"
>

/**
 * CurrencyInput parsing in the panel language, for forms that keep the
 * library's own `{ value, float }` pair and read the amount from `float`.
 */
export const PanelCurrencyInput = forwardRef<
  HTMLInputElement,
  PanelCurrencyInputProps
>((props, ref) => {
  const numberInput = useNumberInputLocale()

  return (
    <CurrencyInput
      {...props}
      ref={ref}
      intlConfig={numberInput.intlConfig}
      decimalSeparator={numberInput.decimalSeparator}
      groupSeparator={numberInput.groupSeparator}
    />
  )
})
PanelCurrencyInput.displayName = "PanelCurrencyInput"
