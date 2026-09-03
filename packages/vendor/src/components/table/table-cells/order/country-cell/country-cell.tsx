import { Tooltip } from "@medusajs/ui"
import ReactCountryFlag from "react-country-flag"
import { useTranslation } from "react-i18next"
import { PlaceholderCell } from "../../common/placeholder-cell"
import { HttpTypes } from "@medusajs/types"
import { getLocalizedCountryName } from "../../../../lib/format-country-name"

type Country = Omit<HttpTypes.AdminRegionCountry, "id"> & {
  id?: string
}

export const CountryCell = ({
  country,
}: {
  country?: Country | null
}) => {
  const { i18n } = useTranslation()

  if (!country) {
    return <PlaceholderCell />
  }

  const localizedName = getLocalizedCountryName(country, i18n.language)

  return (
    <div className="flex size-5 items-center justify-center">
      <Tooltip content={localizedName}>
        <div className="flex size-4 items-center justify-center overflow-hidden rounded-sm">
          <ReactCountryFlag
            countryCode={country.iso_2!.toUpperCase()}
            svg
            style={{
              width: "16px",
              height: "16px",
            }}
            aria-label={localizedName}
          />
        </div>
      </Tooltip>
    </div>
  )
}
