import { HttpTypes } from "@medusajs/types"
import { UIMatch } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { useTaxRegion } from "@hooks/api"
import { getCountryByIso2 } from "@lib/data/countries"
import { getLocalizedCountryName } from "@lib/format-country-name"

type TaxRegionDetailBreadcrumbProps = UIMatch<HttpTypes.AdminTaxRegionResponse>

export const TaxRegionDetailBreadcrumb = (
  props: TaxRegionDetailBreadcrumbProps
) => {
  const { id } = props.params || {}
  const { i18n } = useTranslation()

  const { tax_region } = useTaxRegion(id!, undefined, {
    initialData: props.data,
    enabled: Boolean(id),
  })

  if (!tax_region) {
    return null
  }

  return (
    <span>
      {getLocalizedCountryName(
        getCountryByIso2(tax_region.country_code),
        i18n.language,
      ) || tax_region.country_code?.toUpperCase()}
    </span>
  )
}
