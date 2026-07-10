import { useTranslation } from "react-i18next"
import { Text } from "@medusajs/ui"
import { CheckCircleSolid } from "@medusajs/icons"

type ImportSummaryProps = {
  created: number
}

export const ImportSummary = ({ created }: ImportSummaryProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-y-4 py-8">
      <CheckCircleSolid className="text-ui-fg-interactive" />
      <div className="flex flex-col items-center gap-y-1">
        <Text size="large" weight="plus">
          {t("productImportExport.importCompleteTitle")}
        </Text>
        <Text className="text-ui-fg-subtle">
          {t("productImportExport.importCompleteDescription", { count: created })}
        </Text>
      </div>
    </div>
  )
}
