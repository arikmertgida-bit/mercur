import { Input } from "@medusajs/ui"
import { ChangeEvent, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { useDebouncedAction } from "../../../hooks/use-debounced-action"

type QueryProps = {
  placeholder?: string
}

export const Query = ({ placeholder }: QueryProps) => {
  const { t } = useTranslation()
  const placeholderText = placeholder || t("general.search")

  const [searchParams, setSearchParams] = useSearchParams()
  const [inputValue, setInputValue] = useState(searchParams.get("q") || "")
  const debounceUpdate = useDebouncedAction(500)

  const updateSearchParams = (newValue: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)

      if (newValue) {
        next.set("q", newValue)
      } else {
        next.delete("q")
      }

      return next
    })
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value

    setInputValue(value)
    debounceUpdate(() => updateSearchParams(value))
  }

  return (
    <Input
      type="search"
      size="small"
      value={inputValue}
      onChange={handleInputChange}
      placeholder={placeholderText}
    />
  )
}
