import { Input } from "@medusajs/ui"
import { ChangeEvent } from "react"
import { useTranslation } from "react-i18next"

import { useDebouncedAction } from "@mercurjs/dashboard-shared"
import { useSelectedParams } from "../hooks"

type DataTableSearchProps = {
  placeholder?: string
  prefix?: string
  autofocus?: boolean
}

export const DataTableSearch = ({
  placeholder,
  prefix,
  autofocus: _autofocus,
}: DataTableSearchProps) => {
  const { t } = useTranslation()
  const placeholderText = placeholder || t("general.search")
  const selectedParams = useSelectedParams({
    param: "q",
    prefix,
    multiple: false,
  })

  const query = selectedParams.get()

  const debounceChange = useDebouncedAction(500)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    debounceChange(() => {
      if (!value) {
        selectedParams.delete()
      } else {
        selectedParams.add(value)
      }
    })
  }

  return (
    <Input
      autoComplete="off"
      name="q"
      type="search"
      size="small"
      defaultValue={query?.[0] || undefined}
      onChange={handleChange}
      placeholder={placeholderText}
    />
  )
}
