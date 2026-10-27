import { DescendingSorting } from "@medusajs/icons"
import { DropdownMenu, IconButton } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { z } from "zod"

import { useDocumentDirection } from "../../../../hooks/use-document-direction"

export type DataTableOrderByKey<TData> = {
  key: keyof TData
  label: string
}

type DataTableOrderByProps<TData> = {
  keys: DataTableOrderByKey<TData>[]
  prefix?: string
  defaultKey?: string
}

enum SortDirection {
  ASC = "asc",
  DESC = "desc",
}

const SortDirectionSchema = z.enum(SortDirection)

type SortState = {
  key?: string
  dir: SortDirection
}

const initState = (
  params: URLSearchParams,
  prefix?: string,
  defaultKey?: string,
): SortState => {
  const param = prefix ? `${prefix}_order` : "order"
  const sortParam = params.get(param) ?? defaultKey

  if (!sortParam) {
    return {
      key: undefined,
      dir: SortDirection.ASC,
    }
  }

  const dir = sortParam.startsWith("-") ? SortDirection.DESC : SortDirection.ASC
  const key = sortParam.replace("-", "")

  return {
    key,
    dir,
  }
}

export const DataTableOrderBy = <TData,>({
  keys,
  prefix,
  defaultKey,
}: DataTableOrderByProps<TData>) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setState] = useState<{
    key?: string
    dir: SortDirection
  }>(initState(searchParams, prefix, defaultKey))
  const param = prefix ? `${prefix}_order` : "order"
  const { t } = useTranslation()
  const direction = useDocumentDirection()

  const handleDirChange = (value: string) => {
    const parsed = SortDirectionSchema.safeParse(value)

    if (!parsed.success) {
      return
    }

    const dir = parsed.data

    setState((prev) => ({
      ...prev,
      dir,
    }))
    updateOrderParam({
      key: state.key,
      dir,
    })
  }

  const handleKeyChange = (value: string) => {
    setState((prev) => ({
      ...prev,
      key: value,
    }))

    updateOrderParam({
      key: value,
      dir: state.dir,
    })
  }

  const updateOrderParam = (state: SortState) => {
    if (!state.key) {
      setSearchParams((prev) => {
        prev.delete(param)
        return prev
      })

      return
    }

    const orderParam =
      state.dir === SortDirection.ASC ? state.key : `-${state.key}`
    setSearchParams((prev) => {
      prev.set(param, orderParam)
      return prev
    })
  }

  return (
    <DropdownMenu dir={direction}>
      <DropdownMenu.Trigger asChild>
        <IconButton size="small">
          <DescendingSorting />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="z-[1]" align="end">
        <DropdownMenu.RadioGroup
          value={state.key}
          onValueChange={handleKeyChange}
        >
          {keys.map((key) => {
            const stringKey = String(key.key)

            return (
              <DropdownMenu.RadioItem
                key={stringKey}
                value={stringKey}
                onSelect={(event) => event.preventDefault()}
              >
                {key.label}
              </DropdownMenu.RadioItem>
            )
          })}
        </DropdownMenu.RadioGroup>
        <DropdownMenu.Separator />
        <DropdownMenu.RadioGroup
          value={state.dir}
          onValueChange={handleDirChange}
        >
          <DropdownMenu.RadioItem
            className="flex items-center justify-between"
            value="asc"
            onSelect={(event) => event.preventDefault()}
          >
            {t("general.ascending")}
            <DropdownMenu.Label>1 - 30</DropdownMenu.Label>
          </DropdownMenu.RadioItem>
          <DropdownMenu.RadioItem
            className="flex items-center justify-between"
            value="desc"
            onSelect={(event) => event.preventDefault()}
          >
            {t("general.descending")}
            <DropdownMenu.Label>30 - 1</DropdownMenu.Label>
          </DropdownMenu.RadioItem>
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}
