import { Badge } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

type CellProps = {
  is_combinable: boolean
}

type HeaderProps = {
  text: string
}

export const TypeCell = ({ is_combinable }: CellProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center gap-x-3 overflow-hidden">
      <span className="truncate">
        <Badge size="2xsmall" color={is_combinable ? "green" : "grey"}>
          {is_combinable
            ? t("taxRegions.fields.isCombinable.true")
            : t("taxRegions.fields.isCombinable.false")}
        </Badge>
      </span>
    </div>
  )
}

export const TypeHeader = ({ text }: HeaderProps) => {
  return (
    <div className=" flex h-full w-full items-center">
      <span>{text}</span>
    </div>
  )
}
