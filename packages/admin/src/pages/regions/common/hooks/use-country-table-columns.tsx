import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { StaticCountry } from "../../../../lib/data/countries"

const columnHelper = createColumnHelper<StaticCountry>()

export const useCountryTableColumns = () => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      columnHelper.accessor("display_name", {
        header: t("fields.name"),
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor("iso_2", {
        header: t("fields.code"),
        // String#toUpperCase is locale-independent; CSS `uppercase` follows the
        // page language and turns "vi" into "Vİ" in Turkish.
        cell: ({ getValue }) => getValue().toUpperCase(),
      }),
    ],
    [t]
  )
}
